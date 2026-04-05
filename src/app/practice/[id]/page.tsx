"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ChatInterface from "@/components/conversation/ChatInterface";
import SpeechButton from "@/components/conversation/SpeechButton";

const AvatarCanvas = dynamic(() => import("@/components/avatar/AvatarCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100 rounded-3xl">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  ),
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  japaneseText?: string;
  englishText?: string;
  createdAt: Date;
}

interface Conversation {
  id: string;
  title: string | null;
  messages: Message[];
}

type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationHistoryRef = useRef<Message[]>([]);
  const hasStartedGreetingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function fetchConversation() {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error("Conversation not found");
      }
      const data = await response.json();
      setConversation(data);
      setMessages(data.messages || []);
      conversationHistoryRef.current = data.messages || [];
      
      if (data.messages.length === 0 && !hasStartedGreetingRef.current) {
        hasStartedGreetingRef.current = true;
        startGreeting();
      }
    } catch (err) {
      setError("Failed to load conversation");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    hasStartedGreetingRef.current = false;
    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId]);

  function extractJapaneseAndEnglish(text: string): { japanese?: string; english?: string } {
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF！？。、]+/g;
    const japaneseMatches = text.match(japanesePattern);
    const japanese = japaneseMatches ? japaneseMatches.join("") : undefined;
    
    const englishWithoutJapanese = text.replace(japanesePattern, " ").replace(/\s+/g, " ").trim();
    const english = englishWithoutJapanese || undefined;
    
    return { japanese, english };
  }

  async function startGreeting() {
    setAvatarState("thinking");
    
    const defaultGreeting = "こんにちは！私はゆきです。日本語を練習しましょう！Hello! I'm Yuki. Let's practice Japanese together!";
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          userTranscript: "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Chat API error:", errorData);
        throw new Error("Chat API failed");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const greetingText = data.text || defaultGreeting;
      const { japanese, english } = extractJapaneseAndEnglish(greetingText);
      
      const greetingMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "assistant",
        content: greetingText,
        japaneseText: japanese,
        englishText: english,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, greetingMessage]);
      conversationHistoryRef.current = [...conversationHistoryRef.current, greetingMessage];

      await saveMessage(greetingMessage);
      await playTTS(greetingText, "mixed");
    } catch (err) {
      console.error("Error starting greeting:", err);
      const greetingMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "assistant",
        content: defaultGreeting,
        japaneseText: "こんにちは！私はゆきです。日本語を練習しましょう！",
        englishText: "Hello! I'm Yuki. Let's practice Japanese together!",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, greetingMessage]);
      conversationHistoryRef.current = [...conversationHistoryRef.current, greetingMessage];
      await playTTS("Hello! I'm Yuki. Let's practice Japanese together!", "mixed");
    }
  }

  async function saveMessage(message: Message) {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          role: message.role,
          content: message.content,
        }),
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  }

  async function transcribeAudio(audioBlob: Blob): Promise<string> {
    console.log("=== TRANSCRIBE ===");
    console.log("Audio blob size:", audioBlob.size, "type:", audioBlob.type);
    
    if (audioBlob.size < 1000) {
      console.log("Audio blob too small, ignoring");
      return "";
    }
    
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    console.log("Transcribe response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Transcribe error:", errorData);
      throw new Error(`Transcription failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log("Transcribe result:", data);
    return data.text || "";
  }

  async function getChatResponse(userTranscript: string): Promise<string> {
    const messagesToSend = conversationHistoryRef.current.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    
    console.log("=== CHAT CALL ===");
    console.log("Messages being sent:", JSON.stringify(messagesToSend));
    console.log("User transcript:", userTranscript);
    
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messagesToSend,
        userTranscript,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Chat failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.text;
  }

  async function playTTS(text: string, language: "english" | "japanese" | "mixed" = "english") {
    return new Promise<void>((resolve) => {
      setAvatarState("speaking");
      console.log("Playing TTS:", text.substring(0, 50) + "...");

      fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "mixed", mixed: true }),
      })
        .then((response) => {
          console.log("TTS response status:", response.status);
          if (!response.ok) {
            return response.json().then(err => {
              console.error("TTS API error:", err);
              throw new Error(err.error || "TTS failed");
            });
          }
          return response.blob();
        })
        .then((blob) => {
          console.log("Received audio blob, size:", blob.size);
          if (blob.size === 0) {
            throw new Error("Empty audio blob");
          }
          
          const url = URL.createObjectURL(blob);

          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }

          audioRef.current = new Audio(url);
          audioRef.current.volume = 1.0;

          audioRef.current.oncanplay = () => {
            console.log("Audio can play, starting playback");
            audioRef.current?.play().catch(err => {
              console.error("Play error:", err);
            });
          };

          audioRef.current.onended = () => {
            console.log("Audio ended");
            setAvatarState("idle");
            setAudioLevel(0);
            resolve();
          };

          audioRef.current.onerror = (e) => {
            console.error("Audio error:", e);
            setAvatarState("idle");
            setAudioLevel(0);
            resolve();
          };

          audioRef.current.onplaying = () => {
            const updateLevel = () => {
              if (audioRef.current && !audioRef.current.paused) {
                setAudioLevel(0.3 + Math.random() * 0.5);
                requestAnimationFrame(updateLevel);
              }
            };
            updateLevel();
          };

          return audioRef.current.play();
        })
        .catch((err) => {
          console.error("TTS error:", err);
          setAvatarState("idle");
          setAudioLevel(0);
          resolve();
        });
    });
  }

  const handleAudioData = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setAvatarState("thinking");
    setCurrentError(null);

    try {
      console.log("Starting transcription...");
      const transcript = await transcribeAudio(audioBlob);
      console.log("Transcript received:", transcript);

      if (!transcript || transcript.trim().length === 0) {
        console.log("Empty transcript, ignoring");
        setAvatarState("idle");
        setIsProcessing(false);
        return;
      }

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: transcript,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      conversationHistoryRef.current = [...conversationHistoryRef.current, userMessage];

      await saveMessage(userMessage);

      console.log("Calling chat API...");
      const response = await getChatResponse(transcript);
      console.log("Chat response:", response);
      
      const { japanese, english } = extractJapaneseAndEnglish(response);

      const assistantMessage: Message = {
        id: `temp-${Date.now()}-assistant`,
        role: "assistant",
        content: response,
        japaneseText: japanese,
        englishText: english,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      conversationHistoryRef.current = [...conversationHistoryRef.current, assistantMessage];

      await saveMessage(assistantMessage);

      await playTTS(response, "mixed");
    } catch (err) {
      console.error("Error processing audio:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setCurrentError(`Error: ${errorMsg}`);
      
      const errorMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I couldn't process that. Please try again.`,
        englishText: `Sorry, I couldn't process that. Please try again.`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId]);

  const handleEndSession = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your practice session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>🌸</span>
                Practice Session
              </h1>
              <p className="text-xs text-gray-500">with Yuki</p>
            </div>
          </div>

          <button
            onClick={handleEndSession}
            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            End
          </button>
        </div>
      </header>

      {currentError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 mx-4 flex-shrink-0">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{currentError}</p>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex min-h-0 p-4 gap-4">
          <div className="w-1/5 bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <AvatarCanvas avatarState={avatarState} audioLevel={audioLevel} />
          </div>

          <div className="w-4/5 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg overflow-hidden">
              <ChatInterface messages={messages} isProcessing={isProcessing} />
            </div>

            <div className="bg-indigo-50 rounded-xl p-3">
              <h4 className="font-medium text-indigo-900 mb-1 flex items-center gap-2 text-sm">
                <span>💡</span>
                Tips
              </h4>
              <ul className="text-xs text-indigo-700 space-y-0.5">
                <li>• Speak in Japanese to practice</li>
                <li>• Don&apos;t worry about mistakes</li>
                <li>• Yuki will help correct you</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white border-t shadow-lg px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <SpeechButton
              isListening={isListening}
              isProcessing={isProcessing}
              onAudioData={handleAudioData}
              onListeningStateChange={setIsListening}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
