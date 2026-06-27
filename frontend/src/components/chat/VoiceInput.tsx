import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Toast, ToastTitle, Toaster, useId, useToastController } from '@fluentui/react-components';
import { MicRegular, MicOffRegular } from '@fluentui/react-icons';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const toasterId = useId('voice-toaster');
  const { dispatchToast } = useToastController(toasterId);

  const toggleListening = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      dispatchToast(
        <Toast>
          <ToastTitle>A entrada de voz não é suportada neste navegador.</ToastTitle>
        </Toast>,
        { intent: 'warning' },
      );
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onTranscript(transcript);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null;
      setIsListening(false);

      const msg =
        event.error === 'not-allowed' ? 'Acesso ao microfone negado. Verifique as permissões do seu navegador e certifique-se de acessar via HTTPS.' :
        event.error === 'no-speech'   ? 'Nenhuma fala detectada. Por favor, tente novamente.' :
        event.error === 'network'     ? 'Erro de rede durante a entrada de voz.' :
        undefined;

      if (msg) {
        dispatchToast(
          <Toast><ToastTitle>{msg}</ToastTitle></Toast>,
          { intent: 'error' },
        );
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onTranscript, dispatchToast]);

  return (
    <>
      <Toaster toasterId={toasterId} position="top-end" />
      <Button
        appearance="subtle"
        icon={isListening ? <MicOffRegular /> : <MicRegular />}
        onClick={toggleListening}
        disabled={disabled}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        aria-pressed={isListening}
        className={`${styles.voiceButton} ${isListening ? styles.listening : ''}`}
      >
        {isListening && <span className={styles.pulsingDot} />}
      </Button>
    </>
  );
};
