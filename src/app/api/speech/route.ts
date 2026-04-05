import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";

const deepgram = new DeepgramClient();

const VOICE_OPTIONS = {
  english: "aura-2-thalia-en",
  japanese: "aura-2-izanami-ja",
  default: "aura-2-thalia-en",
};

const JAPANESE_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF！？。，]+/g;

interface TextSegment {
  text: string;
  language: "english" | "japanese";
}

function parseMixedLanguage(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const parts = text.split(/(\s+)/);
  
  let currentLang: "english" | "japanese" | null = null;
  let currentText = "";
  
  for (const part of parts) {
    const isJapanese = JAPANESE_REGEX.test(part);
    JAPANESE_REGEX.lastIndex = 0;
    
    if (isJapanese) {
      if (currentLang === "japanese") {
        currentText += part;
      } else {
        if (currentText) {
          segments.push({ text: currentText.trim(), language: currentLang! });
        }
        currentLang = "japanese";
        currentText = part;
      }
    } else {
      if (currentLang === "english") {
        currentText += part;
      } else {
        if (currentText) {
          segments.push({ text: currentText.trim(), language: currentLang! });
        }
        currentLang = "english";
        currentText = part;
      }
    }
  }
  
  if (currentText.trim()) {
    segments.push({ text: currentText.trim(), language: currentLang! });
  }
  
  return segments.filter(s => s.text.trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language, mixed } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log("Generating speech, language:", language || "default", "mixed:", mixed);

    const audioBuffers: Buffer[] = [];

    if (mixed || language === "mixed") {
      const segments = parseMixedLanguage(text);
      console.log("Parsed segments:", segments.length);
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const voice = segment.language === "japanese" ? VOICE_OPTIONS.japanese : VOICE_OPTIONS.english;
        console.log(`Speaking "${segment.text.substring(0, 30)}..." with ${segment.language} voice`);
        
        // Add pause text between segments for natural transition
        let textToSpeak = segment.text;
        if (i < segments.length - 1) {
          textToSpeak = segment.text + " ... ";
        }
        
        const audioResponse = await deepgram.speak.v1.audio.generate({
          text: textToSpeak,
          model: voice,
        });
        
        const buffer = Buffer.from(await audioResponse.arrayBuffer());
        audioBuffers.push(buffer);
      }
    } else {
      const voice = VOICE_OPTIONS[language as keyof typeof VOICE_OPTIONS] || VOICE_OPTIONS.default;
      console.log("Using voice:", voice);
      
      const audioResponse = await deepgram.speak.v1.audio.generate({
        text,
        model: voice,
      });
      
      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      audioBuffers.push(buffer);
    }
    
    const combined = Buffer.concat(audioBuffers);
    
    return new NextResponse(combined, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": combined.length.toString(),
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
