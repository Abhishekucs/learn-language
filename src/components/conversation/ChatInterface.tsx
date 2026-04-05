"use client";

import { useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  japaneseText?: string;
  englishText?: string;
  createdAt: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  isProcessing: boolean;
}

export default function ChatInterface({ messages, isProcessing }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-white/50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">💬</span>
          Conversation
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">Start speaking in Japanese!</p>
            <p className="text-sm">
              Yuki will respond and help you practice your conversation skills.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === "user"
                  ? "bg-indigo-500 text-white rounded-br-md"
                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {message.role === "assistant" && (
                <div className="text-xs text-indigo-400 font-medium mb-2">
                  Yuki
                </div>
              )}

              {message.role === "user" ? (
                <div>
                  <p className="text-sm font-medium mb-1">🗣️ Your Japanese:</p>
                  <p className="text-base leading-relaxed">{message.content}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {message.japaneseText && (
                    <div className="bg-purple-50 rounded-lg p-2 border-l-4 border-purple-400">
                      <p className="text-xs text-purple-600 font-medium mb-1">🇯🇵 日本語 (Japanese):</p>
                      <p className="text-base leading-relaxed text-purple-900">{message.japaneseText}</p>
                    </div>
                  )}
                  {message.englishText && (
                    <div className="bg-blue-50 rounded-lg p-2 border-l-4 border-blue-400">
                      <p className="text-xs text-blue-600 font-medium mb-1">🇺🇸 English (Explanation):</p>
                      <p className="text-sm leading-relaxed text-blue-900">{message.englishText}</p>
                    </div>
                  )}
                  {!message.japaneseText && !message.englishText && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              )}
              
              <div
                className={`text-xs mt-2 ${
                  message.role === "user" ? "text-indigo-200" : "text-gray-400"
                }`}
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm">Yuki is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
