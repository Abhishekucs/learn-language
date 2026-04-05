"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SpeechButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onAudioData: (blob: Blob) => void;
  onListeningStateChange: (listening: boolean) => void;
}

export default function SpeechButton({
  isListening,
  isProcessing,
  onAudioData,
  onListeningStateChange,
}: SpeechButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      audioLevelRef.current = normalizedLevel;
      setAudioLevel(normalizedLevel);
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const stopRecording = useCallback(() => {
    console.log("stopRecording called, current state:", mediaRecorderRef.current?.state, "isRecording:", isRecording);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      console.log("Stopping MediaRecorder...");
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onListeningStateChange(false);
      setAudioLevel(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      console.log("MediaRecorder not in recording state or already stopped");
    }
  }, [isRecording, onListeningStateChange]);

  const startRecording = async () => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      console.log("Microphone access granted");

      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === "suspended") {
        console.log("AudioContext suspended, resuming...");
        await audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.log("Codec not supported, trying alternatives...");
        mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "";
      }

      console.log("Using mimeType:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      let chunkCount = 0;
      let lastDataTime = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        const now = Date.now();
        console.log(`Data available after ${now - lastDataTime}ms, size:`, event.data.size);
        lastDataTime = now;
        if (event.data.size > 0) {
          chunkCount++;
          chunks.push(event.data);
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
      };

      mediaRecorder.onstop = () => {
        console.log("onstop called, chunks collected:", chunkCount);
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        console.log("Recording stopped, blob size:", blob.size, "chunks:", chunkCount);
        
        if (blob.size > 1000) {
          console.log("Sending audio blob to handler...");
          onAudioData(blob);
        } else {
          console.log("Audio too short or empty, ignoring. Size:", blob.size);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      
      if (mimeType) {
        mediaRecorder.start(100);
      } else {
        mediaRecorder.start();
      }
      
      setIsRecording(true);
      onListeningStateChange(true);
      updateAudioLevel();
      
      console.log("Recording started, state:", mediaRecorder.state);
      
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          console.log("Auto-stopping after 30 seconds to prevent infinite recording");
          stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please allow microphone access and try again.");
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isProcessing && !isRecording) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startRecording();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (isRecording) {
      stopRecording();
    }
  };

  const isDisabled = isProcessing;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={isDisabled}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerUp}
          className={`
            w-28 h-28 rounded-full flex items-center justify-center 
            transition-all duration-200 select-none touch-none
            focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-offset-2
            ${isDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : isRecording
              ? "bg-red-500 shadow-lg shadow-red-500/50"
              : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-lg shadow-indigo-500/30 active:bg-indigo-800"
            }
          `}
        >
          <div className="flex flex-col items-center text-white">
            <svg
              className={`w-10 h-10 ${isRecording ? "animate-pulse" : ""}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {isRecording ? (
                <path d="M6 6h12v12H6z" />
              ) : (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
              )}
            </svg>
            <span className="text-sm font-semibold mt-1">
              {isRecording ? "Stop" : "Speak"}
            </span>
          </div>
        </button>

        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping pointer-events-none" />
        )}

        {isRecording && (
          <div className="absolute -inset-6 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-red-300"
                style={{
                  transform: `scale(${1 + audioLevel * 0.2 + i * 0.08})`,
                  opacity: Math.max(0, 0.4 - audioLevel * 0.3 - i * 0.1),
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 font-medium">
          {isDisabled
            ? "Processing..."
            : isRecording
            ? "Listening... Release to send"
            : "Press and hold to speak"}
        </p>
        {isRecording && (
          <div className="flex justify-center gap-1 mt-2">
            {[0.2, 0.4, 0.6, 0.8, 1].map((threshold, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  audioLevel > threshold ? "bg-red-500" : "bg-gray-300"
                }`}
                style={{
                  height: `${10 + i * 5}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
