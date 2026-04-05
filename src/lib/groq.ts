import OpenAI from "openai";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const LLM_MODEL = "llama-3.3-70b-versatile";
export const WHISPER_MODEL = "whisper-large-v3";
export const TTS_MODEL = "playai-tts";
