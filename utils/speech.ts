let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speak Arabic text using the browser's speech synthesis.
 * Uses an Arabic voice when available.
 */
export function speakArabic(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = 0.9;

  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find((v) => v.lang.startsWith("ar"));
  if (arabicVoice) utterance.voice = arabicVoice;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech synthesis.
 */
export function stopSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}
