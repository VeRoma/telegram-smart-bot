// import OpenAI from 'openai';
const { OpenAI } = require("openai");
require("dotenv").config();

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY // This is the default and can be omitted
	
});



async function main() {
	const stream = await client.chat.completions.create({
	  model: 'gpt-4',
	  messages: [{ role: 'user', content: 'Say this is a test' }],
	  stream: true,
	});
	for await (const chunk of stream) {
	  process.stdout.write(chunk.choices[0]?.delta?.content || '');
	}
  }

  main();

  /*
async function main() {
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    messages: [{ role: 'user', content: 'Say this is a test' }],
    model: 'gpt-3.5-turbo',
  };
  const chatCompletion: OpenAI.Chat.ChatCompletion = await client.chat.completions.create(params);
}	//	*/




//======================	
/*

import OpenAI from 'openai';

const client = new OpenAI();

async function main() {
  const stream = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Say this is a test' }],
    stream: true,
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();		//		*/