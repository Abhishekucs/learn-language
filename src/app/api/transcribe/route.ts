import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const WHISPER_MODEL = "whisper-large-v3";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log("Transcribing audio, size:", audioFile.size, "type:", audioFile.type);

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    const transcription = await groq.audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: audioFile.type || "audio/webm" }),
      model: WHISPER_MODEL,
      language: "ja",
      response_format: "json",
    });

    console.log("Transcription result:", transcription.text);

    return NextResponse.json({
      text: transcription.text || "",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to transcribe audio: ${errorMessage}` },
      { status: 500 }
    );
  }
}
