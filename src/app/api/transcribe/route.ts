import { NextRequest, NextResponse } from "next/server";

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

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mimetype = audioFile.type || "audio/webm";
    
    console.log("=== TRANSCRIBE ===");
    console.log("Audio size:", audioBuffer.length, "type:", mimetype);

    const apiKey = process.env.DEEPGRAM_API_KEY;
    console.log("API Key present:", !!apiKey, "Length:", apiKey?.length);
    
    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", "general");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("detect_language", "true");
    
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "audio/webm",
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", response.status, errorText);
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Deepgram response:", JSON.stringify(result, null, 2).substring(0, 2000));

    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence;
    
    console.log("Transcription:", transcript);
    console.log("Confidence:", confidence);

    return NextResponse.json({ text: transcript, confidence });
  } catch (error) {
    console.error("Transcription error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to transcribe audio: ${errorMessage}` },
      { status: 500 }
    );
  }
}
