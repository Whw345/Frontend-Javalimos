"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserSupport } from "./useBrowserSupport";

/**
 * Dictado con el reconocimiento de voz del navegador (Web Speech API). Lo dictado se
 * convierte en texto que el estudiante puede corregir antes de enviarlo.
 * Opcionalmente graba el audio en paralelo (MediaRecorder) para enviarlo al backend.
 */

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly 0: RecognitionAlternative;
}

interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<RecognitionResult>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isDictationSupported(): boolean {
  return (
    Boolean(recognitionConstructor()) && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices)
  );
}

/** Pide el permiso del micrófono (en la intro, no a mitad del debate). */
export async function requestMicrophone(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export type DictationError = "denied" | "unavailable" | null;

interface DictationOptions {
  /** Cada fragmento confirmado por el reconocedor. */
  onFinal: (text: string) => void;
  /** El navegador negó el micrófono durante el debate. */
  onDenied?: () => void;
  lang?: string;
  /** Graba también el audio para adjuntarlo al turno. */
  recordAudio?: boolean;
}

export function useDictation({ onFinal, onDenied, lang = "es-PE", recordAudio = false }: DictationOptions) {
  const supported = useBrowserSupport(isDictationSupported);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<DictationError>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  // Chrome corta el reconocimiento tras un silencio largo: se reinicia mientras esto sea true.
  const wantedRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const onDeniedRef = useRef(onDenied);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onDeniedRef.current = onDenied;
  });

  const stopRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorder?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    wantedRef.current = false;
    recognitionRef.current?.stop();
    stopRecorder();
    setListening(false);
    setInterim("");
  }, [stopRecorder]);

  const start = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setError("unavailable");
      return;
    }
    setError(null);

    // Una instancia nueva por cada inicio; la anterior se descarta.
    recognitionRef.current?.abort();
    const recognition = new Constructor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) onFinalRef.current(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantedRef.current = false;
        setError("denied");
        setListening(false);
        onDeniedRef.current?.();
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      setInterim("");
      if (wantedRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          wantedRef.current = false;
        }
      }
      setListening(false);
    };
    recognitionRef.current = recognition;
    wantedRef.current = true;

    try {
      recognition.start();
      setListening(true);
    } catch {
      // Ya estaba escuchando.
    }

    if (recordAudio && typeof MediaRecorder !== "undefined" && !recorderRef.current) {
      void navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (!wantedRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
          };
          recorder.start();
          recorderRef.current = recorder;
        })
        .catch(() => undefined);
    }
  }, [lang, recordAudio]);

  const toggle = useCallback(() => (wantedRef.current ? stop() : start()), [start, stop]);

  /** Audio grabado desde la última llamada (o null). Reinicia el búfer. */
  const takeAudio = useCallback((): Blob | null => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    return chunks.length > 0 ? new Blob(chunks, { type: chunks[0]!.type || "audio/webm" }) : null;
  }, []);

  useEffect(
    () => () => {
      wantedRef.current = false;
      recognitionRef.current?.abort();
      stopRecorder();
    },
    [stopRecorder],
  );

  return { supported, listening, interim, error, start, stop, toggle, takeAudio };
}
