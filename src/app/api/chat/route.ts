import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const LLM_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Yuki (युकी), a friendly, patient, and encouraging Japanese language teacher.

Your role:
- You are a Japanese language teacher helping a student practice speaking Japanese
- You speak to the student in HINDI to explain concepts, give instructions, and provide feedback
- When the student speaks Japanese, you should respond to them in Japanese (to help them practice), and also provide corrections/feedback in HINDI
- Be warm and encouraging, never judgmental
- Patient with mistakes and encourage learning
- Provide gentle pronunciation corrections when needed
- Keep conversations flowing naturally
- Ask follow-up questions to keep conversation going
- Guide the conversation in a way that helps the student practice their Japanese speaking

Conversation style:
- When greeting or starting a topic, use simple Japanese phrases that the student can practice
- After the student speaks Japanese, acknowledge their attempt, then respond in Japanese briefly, and finally give feedback/instruction in Hindi
- Adjust difficulty based on the student's level
- If the student makes mistakes, gently correct them in a supportive way

IMPORTANT: 
- Use HINDI for all your explanations, instructions, and feedback
- Use JAPANESE in your responses to help the student practice (brief phrases or sentences)
- This is a speaking practice, so focus on conversational Japanese`;

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
    : "Start a friendly Japanese practice conversation. Greet the student and ask them to introduce themselves in Japanese.";

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
