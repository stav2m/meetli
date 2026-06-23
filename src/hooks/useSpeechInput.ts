import { useCallback, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface UseSpeechInputOptions {
  language: string;
  onTranscriptChange: (text: string) => void;
  disabled?: boolean;
}

export function useSpeechInput({
  language,
  onTranscriptChange,
  disabled = false,
}: UseSpeechInputOptions) {
  const baseInputRef = useRef('');
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const speechLanguage = language.startsWith('he') ? 'he-IL' : 'en-US';

  useEffect(() => {
    if (!listening) {
      return;
    }

    const prefix = baseInputRef.current;
    const spacer = prefix && transcript ? ' ' : '';
    onTranscriptChange(prefix + spacer + transcript);
  }, [transcript, listening, onTranscriptChange]);

  useEffect(() => {
    return () => {
      SpeechRecognition.stopListening();
    };
  }, []);

  const startListening = useCallback(
    (currentInput: string) => {
      if (disabled || !browserSupportsSpeechRecognition) {
        return;
      }

      baseInputRef.current = currentInput;
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: speechLanguage });
    },
    [disabled, browserSupportsSpeechRecognition, resetTranscript, speechLanguage],
  );

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  const toggleListening = useCallback(
    (currentInput: string) => {
      if (listening) {
        stopListening();
        return;
      }

      startListening(currentInput);
    },
    [listening, startListening, stopListening],
  );

  return {
    listening,
    browserSupportsSpeechRecognition,
    toggleListening,
    stopListening,
  };
}
