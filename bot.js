require("dotenv").config();
const { OpenAI } = require("openai");
const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
// const axios = require("axios");
// const fs = require('fs');
// const path = require('path');

// Настройка OpenAI через apiKey
const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Объект для хранения истории сообщений
const userHistories = new Map();

// Объект для хранения идентификаторов таймеров
const userIntervals = new Map();

// Функция для запроса к OpenAI
const requestOpenAI = async (messages, model = "gpt-4-turbo") => {
	let responseText = "";
	const stream = await client.chat.completions.create({
		model: model,
		messages: messages,
		stream: true,
	});
	for await (const chunk of stream) {
		responseText += chunk.choices[0]?.delta?.content || "";
	}
	return responseText;
};

// Главная асинхронная функция
async function main() {
	try {
		const botToken = process.env.BOT_TOKEN;
		if (!botToken) {
			throw new Error("BOT_TOKEN не задан в переменных окружения");
		}

		const bot = new Telegraf(botToken);

		// Функция для отправки сообщения пользователю
		const sendMessageToUser = async (chatId, message) => {
			try {
				await bot.telegram.sendMessage(chatId, message);
				console.log(`Message sent to chat ${chatId}: ${message}`);
			} catch (error) {
				console.error(
					`Failed to send message to chat ${chatId}: ${error.message}`
				);
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

		// Функция для запроса к DALL-E 3
		const requestDalle = async (prompt) => {
			const response = await client.images.generate({
				prompt: prompt,
				n: 1, // количество изображений
				size: "512x512", // размер изображения
			});

			return response.data[0].url;
		};

		// ======== Обработка событий в чате ===========

		bot.start((ctx) => {
			ctx.reply("Welcome");
		});

		// Обработчик команды /startTimer
		bot.command("startTimer", (ctx) => {
			const chatId = ctx.chat.id;
			const interval = 5000; // 1 минута в миллисекундах
			const message = `Это периодическое сообщение, которое будет отправляться с периодичностью: ${interval} мc.`;

			// Запускаем периодическую отправку сообщений
			startSendingMessages(chatId, message, interval);

			ctx.reply(
				`Бот запущен и будет отправлять вам сообщения с периодичностью: ${interval} мc.`
			);
		});

		// Обработчик команды /stop
		bot.command("stopTimer", (ctx) => {
			const chatId = ctx.chat.id;

			// Останавливаем периодическую отправку сообщений
			stopSendingMessages(chatId);

			ctx.reply("Отправка сообщений по Таймеру остановлена.");
		});

		bot.on("text", async (ctx) => {
			const userId = ctx.message.from.id;
			const userQuestion = ctx.message.text;

			console.log("Question:", userQuestion);

			// Получаем историю сообщений пользователя или создаем новую
			let userHistory = userHistories.get(userId) || [];

			// Добавляем текущее сообщение пользователя в историю
			userHistory.push({ role: "user", content: userQuestion });

			try {
				// Запрашиваем ответ от OpenAI
				const responseText = await requestOpenAI(userHistory);
				console.log("Answer:", responseText);

				// Добавляем ответ бота в историю
				userHistory.push({ role: "assistant", content: responseText });

				// Сохраняем обновленную историю сообщений
				userHistories.set(userId, userHistory);

				// Отправляем ответ пользователю
				await ctx.reply(responseText);
			} catch (error) {
				await ctx.reply(
					"Извините, возникла проблема с обращением к OpenAI API: " +
						error.message
				);
			}
		});

		bot.help((ctx) => ctx.reply("Send me a sticker"));
		bot.on(message("sticker"), (ctx) => ctx.reply("👍"));

		/*	bot.on(message("photo"), async (ctx) => {
			// const photo = ctx.message.photo.pop();
			// const fileId = photo.file_id;
			// const file = await bot.telegram.getFile(fileId);
			// const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

			// console.log("Received photo URL:", fileUrl);

			// Скачиваем изображение
			// const filepath = path.join(__dirname, 'temp.jpg');
			// await downloadImage(fileUrl, filepath);

			// Здесь можно добавить анализ изображения, если это необходимо

			// Пример текстовой подсказки для DALL-E 3
			// const prompt = `нарисуй знака бесконечности из красной ленты, визуально изменяющейся ширины, левая часть меньше правой в 1.5-2 раза. логотип на тёмно-красном фоне`;
			const prompt = `draw openai logo`;

			try {
				// Запрашиваем изображение от DALL-E 3
				const imageUrl = await requestDalle(prompt);
				// console.log("Generated Image URL:", imageUrl);

				// Отправляем сгенерированное изображение пользователю
				await ctx.replyWithPhoto(imageUrl);
			} catch (error) {
				await ctx.reply(
					"Извините, возникла проблема с обращением к OpenAI API: " +
						error.message
				);
			}
		});		//	*/

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
