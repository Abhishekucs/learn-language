import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const LLM_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Yuki (ユキ), a friendly, patient, and encouraging Japanese language teacher.

Your role:
- You are a Japanese language teacher helping a student practice speaking Japanese
- You explain concepts and provide feedback in a combination of ENGLISH and JAPANESE
- Mix Japanese phrases naturally with English explanations
- For example: "Hello! こんにちは! Today we'll practice self-introduction. 今日は自己紹介を練習しましょう！"

Your characteristics:
- Warm and welcoming, never judgmental
- Patient with mistakes and encourage learning
- Provide gentle pronunciation corrections when needed
- Keep conversations flowing naturally
- Ask follow-up questions to keep conversation going
- Use simple Japanese phrases that the student can practice

Response format guidelines:
- Start with a friendly greeting or acknowledgment
- Include 1-3 Japanese phrases per response for the student to practice
- Add English explanations for grammar or vocabulary
- Keep it conversational and encouraging
- Adjust difficulty based on student's level

IMPORTANT:
- Mix ENGLISH and JAPANESE naturally in your responses
- Japanese phrases should be in 日本語 (with English explanation)
- This helps students learn both the language and understand it`;

type Message = { role: string; content: string };

async function getChatResponse(messages: Message[], userTranscript: string) {
  console.log("Groq API Key present:", !!process.env.GROQ_API_KEY);
  
  const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = 
    (messages || []).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));

  const userMessage = userTranscript
    ? `The student spoke in Japanese: "${userTranscript}"`
    : "Start a friendly Japanese practice conversation. Greet the student, introduce yourself, and ask them to say hello in Japanese.";

  console.log("Calling Groq with model:", LLM_MODEL);

  try {
    const completion = await groq.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationMessages,
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    const response = completion.choices[0]?.message?.content || "";
    console.log("Groq response received, length:", response.length);

    return { text: response, role: "assistant" };
  } catch (error: any) {
    console.error("Groq API error:", error?.message || error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userTranscript } = body;

    const result = await getChatResponse(messages, userTranscript);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Chat failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const messagesParam = searchParams.get("messages");
  const userTranscript = searchParams.get("userTranscript") || "";

  try {
    const messages = messagesParam ? JSON.parse(messagesParam) : [];
    const result = await getChatResponse(messages, userTranscript);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Chat failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
