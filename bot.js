require("dotenv").config();

const { OpenAI } = require("openai");

const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");



const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function main() {
    try {
        const assistant = await openai.beta.assistants.create({
            name: "Math Tutor",
            instructions: "user",
            tools: [{ type: "code_interpreter" }],
            model: "gpt-4-1106-preview",
        });

        // Create a thread
        const thread = await openai.beta.threads.create();

        const bot = new Telegraf(process.env.BOT_API_KEY);
        bot.on(message("text"), async (ctx) => {
            // Explicit usage
            // await ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.message}`)
            // Using context shortcut
            //await ctx.reply(ctx.message.text);

            const userQuestion = ctx.message.text;

            console.log("Question:");
            console.log(userQuestion);

            // Pass in the user question into the existing thread
            await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: userQuestion,
            });

            // Use runs to wait for the assistant response and then retrieve it
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: assistant.id,
            });

            let runStatus = await openai.beta.threads.runs.retrieve(
                thread.id,
                run.id
            );

            // Polling mechanism to see if runStatus is completed
            // This should be made more robust.
            while (runStatus.status !== "completed") {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                runStatus = await openai.beta.threads.runs.retrieve(
                    thread.id,
                    run.id
                );
            }

            // Get the last assistant message from the messages array
            const messages = await openai.beta.threads.messages.list(thread.id);

            // Find the last message for the current run
            const lastMessageForRun = messages.data
                .filter(
                    (message) =>
                        message.run_id === run.id &&
                        message.role === "assistant"
                )
                .pop();

            // If an assistant message is found, console.log() it
            if (lastMessageForRun) {
                console.log("Answer:");
                console.log(`${lastMessageForRun.content[0].text.value} \n`);
                await ctx.reply(lastMessageForRun.content[0].text.value);
            }
        });

        bot.launch();

        // Enable graceful stop
        process.once("SIGINT", () => bot.stop("SIGINT"));
        process.once("SIGTERM", () => bot.stop("SIGTERM"));
    } catch (error) {
        console.error(error);
    }
}

// Call the main function
main();
