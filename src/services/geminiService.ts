import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export async function* sendMessageStream(history: Message[], message: string) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a helpful, creative, and clever AI assistant. You provide clear, accurate, and concise answers. When writing code, use markdown blocks with language identifiers.",
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });

  const result = await chat.sendMessageStream({ message });

  for await (const chunk of result) {
    const text = (chunk as GenerateContentResponse).text;
    if (text) {
      yield text;
    }
  }
}
