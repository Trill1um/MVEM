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
  return `
  You are an environmental safety assistant. Analyze the following sensor data and provide a clear, concise safety analysis and recommendations for each audience.

  Sensor Data:
  - Temperature: ${sensorData.temperature}°C
  - Humidity: ${sensorData.humidity}%
  - Air Quality PPM: ${sensorData.airQuality}
  - Resistance: ${sensorData.resistance} Ohms

  Instructions:
  - Do NOT repeat the input values in your response.
  - Give a brief analysis of the overall safety.
  - For each audience (residential, emergency services, industrial, agricultural, general public), give a short, actionable recommendation as a separate paragraph, starting with the audience as the title.
  - Use simple language for non-technical users.
  - Output should be plain text, no special symbols or formatting.

  Notes:
  - If any value is outside a safe range, mention it in the analysis.
  - If all values are safe, say so clearly.
  `
  ;
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