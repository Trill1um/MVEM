// Guide siguro:
// do 'npm install' if not already done
// do 'npm install groq-sdk' in the backend folder (its already in package.json)
// make sure GROQ_API_KEY is set in your .env file
// do 'node tests/ai_console_test.js' inside the backend folder to run this script

import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';

dotenv.config();

const groqApiKey = process.env.GROQ_API_KEY;
const model = 'openai/gpt-oss-120b';


function buildPrompt(sensorData) {
  return `Based on the given data, tell the user if the area is safe.\nThe given values are:\n` +
    `Temperature: ${sensorData.temperature}°C, ` +
    `Humidity: ${sensorData.humidity}%, ` +
    `Air Quality PPM: ${sensorData.airQuality}, ` +
    `Resistance: ${sensorData.resistance} Ohms`;
}


if (!groqApiKey) {
  throw new Error('GROQ_API_KEY is not set. Set it in your environment or in backend/.env (GROQ_API_KEY=your_key)');
}


export async function runAIWithSensorData(sensorData) {
  try {
    const groq = new Groq({ groqApiKey });
    const prompt = buildPrompt(sensorData);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: prompt }
      ],
      model,
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: true,
      stop: null
    });

    let output = '';
    for await (const chunk of chatCompletion) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      output += content;
    }

    console.log('GROQ response:', output.trim());

    return output.trim();
  } catch (err) {
    console.error('GROQ request failed:', err?.message || err);
    throw err;
  }
}