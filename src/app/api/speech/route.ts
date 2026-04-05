import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";

const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY,
});

const VOICE_OPTIONS = {
  english: "aura-english-us-mult regional",
  japanese: "aura-japanese-jp-tsukuyomi",
  default: "aura-english-us-mult regional",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log("Generating speech with Deepgram, language:", language || "default");

    const voice = VOICE_OPTIONS[language as keyof typeof VOICE_OPTIONS] || VOICE_OPTIONS.default;

    const audioResponse = await deepgram.speak.v1.audio.generate({
      text,
      model: voice,
    });

    const arrayBuffer = await audioResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate speech: ${errorMessage}` },
      { status: 500 }
    );
  }
}
