import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";

const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY,
});

const VOICE_OPTIONS = {
  english: "aura-2-thalia-en",
  japanese: "aura-2-izanami-ja",
  default: "aura-2-thalia-en",
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
    console.log("Using voice:", voice);

    const audioResponse = await deepgram.speak.v1.audio.generate({
      text,
      model: voice,
    });

    const arrayBuffer = await audioResponse.arrayBuffer();
    console.log("Generated audio size:", arrayBuffer.byteLength);

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    return NextResponse.json(
      { error: `Failed to generate speech: ${errorMessage}` },
      { status: 500 }
    );
  }
}
