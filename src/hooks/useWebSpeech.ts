import { useState, useEffect, useRef, useCallback } from 'react';
import { sound, haptic } from '../utils/audioHaptics';
import { CategorySlug } from '../types';

export interface VoiceCommandResult {
  rawText: string;
  action?: 'search' | 'open_map' | 'decide' | 'open_cupons' | 'filter_companion' | 'filter_category';
  companion?: 'casal' | 'amigos' | 'sozinho' | 'familia';
  category?: CategorySlug;
  cleanQuery?: string;
}

export function parseVoiceCommand(text: string): VoiceCommandResult {
  const lower = text.toLowerCase().trim();

  // 1. Direct app navigation commands
  if (lower.includes('abrir mapa') || lower.includes('ver no mapa') || lower.includes('mostrar mapa') || lower.includes('ir para o mapa')) {
    return { rawText: text, action: 'open_map' };
  }

  if (lower.includes('decide por mim') || lower.includes('escolhe pra mim') || lower.includes('o que fazer agora') || lower.includes('me surpreenda')) {
    return { rawText: text, action: 'decide' };
  }

  if (lower.includes('cupom') || lower.includes('cupons') || lower.includes('desconto') || lower.includes('promoção') || lower.includes('promocao')) {
    return { rawText: text, action: 'open_cupons' };
  }

  // 2. Companion detection
  if (lower.includes('date') || lower.includes('romântico') || lower.includes('romantico') || lower.includes('casal') || lower.includes('a dois') || lower.includes('namorada') || lower.includes('namorado')) {
    return { rawText: text, action: 'filter_companion', companion: 'casal', cleanQuery: 'date romântico' };
  }

  if (lower.includes('amigo') || lower.includes('amigos') || lower.includes('galera') || lower.includes('turma') || lower.includes('com a galera')) {
    return { rawText: text, action: 'filter_companion', companion: 'amigos', cleanQuery: 'com amigos' };
  }

  if (lower.includes('sozinho') || lower.includes('sozinha') || lower.includes('trabalhar') || lower.includes('estudar') || lower.includes('foco')) {
    return { rawText: text, action: 'filter_companion', companion: 'sozinho', cleanQuery: 'sozinho' };
  }

  if (lower.includes('família') || lower.includes('familia') || lower.includes('criança') || lower.includes('crianca') || lower.includes('pais')) {
    return { rawText: text, action: 'filter_companion', companion: 'familia', cleanQuery: 'em família' };
  }

  // 3. Category detection
  if (lower.includes('teatro') || lower.includes('show') || lower.includes('peça') || lower.includes('peca') || lower.includes('ingresso') || lower.includes('sympla') || lower.includes('musical') || lower.includes('stand up')) {
    return { rawText: text, action: 'filter_category', category: 'eventos', cleanQuery: 'teatro e shows com ingressos' };
  }

  if (lower.includes('barbearia') || lower.includes('corte') || lower.includes('barba') || lower.includes('cabelo') || lower.includes('salão') || lower.includes('salao') || lower.includes('academia') || lower.includes('fitness') || lower.includes('treino')) {
    return { rawText: text, action: 'filter_category', category: 'barbearias', cleanQuery: 'cuidado pessoal e estilo' };
  }

  if (lower.includes('bar') || lower.includes('drink') || lower.includes('drinque') || lower.includes('cerveja') || lower.includes('chopp') || lower.includes('coquetel') || lower.includes('boteco') || lower.includes('pub')) {
    return { rawText: text, action: 'filter_category', category: 'bares', cleanQuery: 'bares e coquetéis' };
  }

  if (lower.includes('café') || lower.includes('cafe') || lower.includes('brunch') || lower.includes('doceria') || lower.includes('confeitaria')) {
    return { rawText: text, action: 'filter_category', category: 'cafes', cleanQuery: 'café e brunch' };
  }

  if (lower.includes('balada') || lower.includes('festa') || lower.includes('dançar') || lower.includes('dj') || lower.includes('noitada') || lower.includes('pista')) {
    return { rawText: text, action: 'filter_category', category: 'baladas', cleanQuery: 'baladas e noitada' };
  }

  if (lower.includes('restaurante') || lower.includes('jantar') || lower.includes('almoço') || lower.includes('almoco') || lower.includes('pizza') || lower.includes('sushi') || lower.includes('massa') || lower.includes('hambúrguer') || lower.includes('hamburguer')) {
    return { rawText: text, action: 'filter_category', category: 'restaurantes', cleanQuery: 'restaurantes' };
  }

  // Clean search query by stripping common introductory phrases
  const cleaned = lower
    .replace(/^(onde tem|onde fica|quero um|quero ir|busca|buscar|procure|procura|pesquise|pesquisa|encontra|encontre|me mostra|mostra|vamos para|me leva para|me leva em)\s+/i, '')
    .trim();

  return {
    rawText: text,
    action: 'search',
    cleanQuery: cleaned || text,
  };
}

export function useWebSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for native Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    sound.tap();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignored
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (onResultCallback?: (result: VoiceCommandResult) => void) => {
      sound.tap();
      haptic.medium();
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        setError('Navegador sem suporte à API Web Speech nativa.');
        return;
      }

      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let finalSpeech = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalSpeech += res[0].transcript;
            } else {
              currentInterim += res[0].transcript;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalSpeech) {
            const cleanFinal = finalSpeech.trim();
            setTranscript(cleanFinal);
            setInterimTranscript('');
            haptic.success();
            if (onResultCallback) {
              const command = parseVoiceCommand(cleanFinal);
              onResultCallback(command);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech recognition event error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Permissão de microfone negada. Autorize o microfone para falar.');
          } else if (event.error === 'no-speech') {
            setError('Nenhuma voz detectada. Tente falar novamente.');
          } else {
            setError(`Erro no reconhecimento: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('Failed to start Web Speech recognition:', err);
        setError('Não foi possível iniciar o microfone.');
        setIsListening(false);
      }
    },
    []
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
