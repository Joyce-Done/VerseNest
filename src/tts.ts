/**
 * Native Device Text-to-Speech (TTS) Engine for VerseNest
 * Uses native Web Speech API (AVFoundation on iOS, Android TextToSpeech on Android).
 * Zero third-party API dependencies. Operates entirely local/offline.
 */

import { Verse } from './types';

export type PlaybackSpeed = 'normal' | 'slow';

export const PLAYBACK_SPEED_RATES: Record<PlaybackSpeed, number> = {
  normal: 1.0,
  slow: 0.75, // Slower pace for younger kids to follow and enunciate words clearly
};

export const PLAYBACK_SPEED_CONFIG: Record<
  PlaybackSpeed,
  { label: string; rate: number; description: string }
> = {
  normal: {
    label: 'Normal (1.0x)',
    rate: 1.0,
    description: 'Natural conversational pace for older kids and fluent readers',
  },
  slow: {
    label: 'Slow (0.75x)',
    rate: 0.75,
    description: 'Slower, deliberate cadence ideal for younger kids memorizing word-by-word',
  },
};

/**
 * Checks if device supports native speech synthesis.
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Formats a single verse for speech reading.
 * Explicitly formats ONLY this single verse reference and its scripture text,
 * guaranteeing no other verses or list items are included.
 */
export function formatVerseForSpeech(verse: Pick<Verse, 'book' | 'chapter' | 'verse_range' | 'text'>): string {
  // Clear reference announcement followed by text
  const reference = `${verse.book} chapter ${verse.chapter}, verse ${verse.verse_range}`;
  return `${reference}. ${verse.text}`;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks ONLY the specified verse using native device TTS.
 * Automatically cancels any existing audio first to ensure single-verse isolation.
 */
export function speakVerseLocally(
  verse: Verse,
  speed: PlaybackSpeed,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: unknown) => void;
  }
): boolean {
  if (!isSpeechSynthesisSupported()) {
    return false;
  }

  try {
    // 1. Immediate cancellation ensures tapping one verse strictly halts any other speech.
    window.speechSynthesis.cancel();
    activeUtterance = null;

    // 2. Prepare single-verse text
    const speechText = formatVerseForSpeech(verse);
    const utterance = new SpeechSynthesisUtterance(speechText);
    activeUtterance = utterance;

    // 3. Set native rate based on user-selected speed (0.75x for slow, 1.0x for normal)
    utterance.rate = PLAYBACK_SPEED_RATES[speed] || 1.0;
    utterance.pitch = 1.0;

    // 4. Prefer clear native system voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      // Find native English voice (prefer non-compact/enhanced if available on iOS/Android)
      const preferred = voices.find(
        (v) => (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')) &&
               !v.name.toLowerCase().includes('whisper')
      );
      if (preferred) {
        utterance.voice = preferred;
      }
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      callbacks?.onEnd?.();
    };

    utterance.onerror = (e) => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      callbacks?.onError?.(e);
    };

    // 5. Trigger native OS playback
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    activeUtterance = null;
    callbacks?.onError?.(err);
    return false;
  }
}

/**
 * Halts any active native device speech immediately.
 */
export function stopNativeSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}
