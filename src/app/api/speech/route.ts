import { NextRequest, NextResponse } from "next/server";

const VOICE_MAP: Record<string, string> = {
  "Ashley": "en-US-Neural2-J",
  "da Vinci": "en-US-Neural2-F",
  "default": "en-US-Neural2-A",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    return NextResponse.json({
      text,
      voice: voice || "default",
      message: "Use Web Speech API on client side for TTS",
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "Failed to process TTS request" }, { status: 500 });
  }
}
