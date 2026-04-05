export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback?: PronunciationFeedback;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface PronunciationFeedback {
  score: number;
  issues: string[];
  suggestions: string[];
}

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export interface WebSocketMessage {
  type: "audio" | "transcript" | "end" | "llm_stream" | "tts_stream" | "feedback" | "done" | "error";
  data?: ArrayBuffer | string;
  text?: string;
}
