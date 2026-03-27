/**
 * Голосовой ввод — Web Speech API.
 * Кнопка 🎤 рядом с полем ввода.
 */

import { useState, useCallback, useRef } from 'react';
import { hapticFeedback } from '@/lib/telegram';

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ onResult, disabled, className = '' }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (disabled) return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      onResult('');
      return;
    }
    hapticFeedback('medium');
    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ru-RU';
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) onResult(transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, [disabled, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      disabled={disabled}
      className={`p-2 rounded-xl transition-colors ${listening ? 'bg-red-500/20' : 'bg-[var(--app-bg-secondary)]'} ${className}`}
      aria-label={listening ? 'Остановить' : 'Голосовой ввод'}
      title={listening ? 'Остановить' : 'Голосовой ввод'}
    >
      <span className={listening ? 'animate-pulse' : ''}>🎤</span>
    </button>
  );
}
