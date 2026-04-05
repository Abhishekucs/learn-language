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
- For example: "Hello! こんにちは! Today we'll practice self-introduction."

Your characteristics:
- Warm and welcoming, never judgmental
- Patient with mistakes and encourage learning
- Keep conversations flowing naturally
- Ask follow-up questions to keep conversation going

IMPORTANT BEHAVIOR:
- If the student speaks in ENGLISH or any language other than Japanese, do NOT ignore it
- Acknowledge what they said in their language
- Help them translate their words into Japanese
- Encourage them to practice saying it in Japanese
- Example: If user says "My name is John", respond: "Nice to meet you! In Japanese, you can say 'John san to moushimasu' (ジョンさんと申します) or 'John desu' (ジョンです)"

Response format:
- Mix ENGLISH and JAPANESE naturally
- Keep responses concise (under 80 words)
- Do not repeat the same content twice
- When translating, show both the Japanese phrase AND the romaji pronunciation`;

type Message = { role: string; content: string };

async function getChatResponse(messages: Message[], userTranscript: string) {
  console.log("=== CHAT API ===");
  console.log("Groq API Key present:", !!process.env.GROQ_API_KEY);
  console.log("Messages received:", JSON.stringify(messages));
  console.log("User transcript:", userTranscript);
  
  const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = 
    (messages || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

  console.log("Conversation messages to send:", JSON.stringify(conversationMessages));

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
      temperature: 0.7,
      max_tokens: 400,
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
