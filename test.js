require("dotenv").config();
const { Telegraf } = require("telegraf");

// Главная асинхронная функция
async function main() {
    try {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            throw new Error("BOT_TOKEN не задан в переменных окружения");
        }

        const bot = new Telegraf(botToken);

        // Объект для хранения идентификаторов таймеров
        const userIntervals = new Map();

        // Функция для отправки сообщения пользователю
        const sendMessageToUser = async (chatId, message) => {
            try {
                await bot.telegram.sendMessage(chatId, message);
                console.log(`Message sent to chat ${chatId}: ${message}`);
            } catch (error) {
                console.error(`Failed to send message to chat ${chatId}: ${error.message}`);
            }
        };

        // Запускаем отправку сообщения 
        const startSendingMessages = (chatId, message, interval) => {
            const intervalId = setInterval(() => {
                sendMessageToUser(chatId, message);
            }, interval);

            // Сохраняем идентификатор таймера
            userIntervals.set(chatId, intervalId);
        };

        // Останавливаем отправку сообщений
        const stopSendingMessages = (chatId) => {
            const intervalId = userIntervals.get(chatId);
            if (intervalId) {
                clearInterval(intervalId);
                userIntervals.delete(chatId);
                console.log(`Stopped sending messages to chat ${chatId}`);
            }
        };

        // Обработчик команды /start
        bot.start((ctx) => {
            const chatId = ctx.chat.id;
            const interval = 5000; // 1 минута в миллисекундах
            const message = `Это периодическое сообщение, которое будет отправляться с периодичностью: ${interval} мc.`;

            // Запускаем периодическую отправку сообщений
            startSendingMessages(chatId, message, interval);

            ctx.reply(`Бот запущен и будет отправлять вам сообщения с периодичностью: ${interval} мc.`);
        });

        // Обработчик команды /stop
        bot.command('stop', (ctx) => {
            const chatId = ctx.chat.id;

            // Останавливаем периодическую отправку сообщений
            stopSendingMessages(chatId);

            ctx.reply("Отправка сообщений остановлена.");
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