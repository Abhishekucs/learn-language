import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";
import { Readable } from "stream";

const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY,
});

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

    console.log("Transcribing audio with Deepgram, size:", audioFile.size, "type:", audioFile.type);

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const stream = Readable.from(buffer);

    const response = await deepgram.listen.v1.media.transcribeFile(stream, {
      model: "nova-2",
    });

    const data = response as any;
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    console.log("Deepgram transcription:", transcript);

    return NextResponse.json({
      text: transcript,
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
