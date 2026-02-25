function getArabicVoice(): SpeechSynthesisVoice | null {
  const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
  return voices.find((v) => v.lang.includes("ar")) ?? voices[0] ?? null;
}

export function speakArabic(text: string): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voice = getArabicVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeech(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}
