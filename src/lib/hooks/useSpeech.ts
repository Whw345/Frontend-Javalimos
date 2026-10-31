"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrowserSupport } from "./useBrowserSupport";

/** Preferencia de voz: español peruano, luego latinoamericano, luego cualquier español. */
const VOICE_PREFERENCE = ["es-PE", "es-419", "es-US", "es-MX", "es-ES", "es"];

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  for (const lang of VOICE_PREFERENCE) {
    const voice = voices.find((candidate) => candidate.lang.replace("_", "-").startsWith(lang));
    if (voice) return voice;
  }
  return undefined;
}

const isSpeechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Lectura en voz alta con `speechSynthesis`. El texto siempre está visible aparte. */
export function useSpeech() {
  const supported = useBrowserSupport(isSpeechSupported);
  const [speaking, setSpeaking] = useState(false);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    utterance.lang = voice?.lang ?? "es-PE";
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => cancel, [cancel]);

  return { supported, speaking, speak, cancel };
}
