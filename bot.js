require("dotenv").config();
const { OpenAI } = require("openai");
const { Telegraf } = require("telegraf");

// Настройка OpenAI через apiKey
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Объект для хранения истории сообщений
const userHistories = new Map();

// Функция для запроса к OpenAI
const requestOpenAI = async (messages) => {
    let responseText = '';
    const stream = await client.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        stream: true,
    });
    for await (const chunk of stream) {
        responseText += chunk.choices[0]?.delta?.content || '';
    }
    return responseText;
}

// Главная асинхронная функция
async function main() {
    try {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            throw new Error("BOT_TOKEN не задан в переменных окружения");
        }

        const bot = new Telegraf(botToken);

        bot.on("text", async (ctx) => {
            const userId = ctx.message.from.id;
            const userQuestion = ctx.message.text;

            console.log("Question:", userQuestion);

            // Получаем историю сообщений пользователя или создаем новую
            let userHistory = userHistories.get(userId) || [];

            // Добавляем текущее сообщение пользователя в историю
            userHistory.push({ role: 'user', content: userQuestion });

            try {
                // Запрашиваем ответ от OpenAI
                const responseText = await requestOpenAI(userHistory);
                console.log("Answer:", responseText);

                // Добавляем ответ бота в историю
                userHistory.push({ role: 'assistant', content: responseText });

                // Сохраняем обновленную историю сообщений
                userHistories.set(userId, userHistory);

                // Отправляем ответ пользователю
                await ctx.reply(responseText);
            } catch (error) {
                await ctx.reply("Извините, возникла проблема с обращением к OpenAI API: " + error.message);
            }
        });

        bot.launch();

        // Корректная остановка бота
        process.once("SIGINT", () => bot.stop("SIGINT"));
        process.once("SIGTERM", () => bot.stop("SIGTERM"));
    } catch (error) {
        console.error("Произошла ошибка:", error);
    }
}

// Запуск главной функции
main();