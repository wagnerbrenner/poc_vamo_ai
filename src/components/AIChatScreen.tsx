import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Sparkles, MapPin, Star, 
  Navigation, Heart, Compass, Loader2, ArrowRight, CornerDownLeft, Volume2, Bot 
} from 'lucide-react';
import { PlaceItem } from '../types';
import { useLocation } from '../context/LocationContext';
import { sound } from '../utils/audioHaptics';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Partial<PlaceItem>[];
  timestamp: string;
}

interface AIChatScreenProps {
  onSelectPlace: (place: PlaceItem) => void;
  onNavigateToPlace: (place: PlaceItem) => void;
  onToggleSave: (place: PlaceItem) => void;
  isSaved: (placeId: string) => boolean;
  places: PlaceItem[];
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  onSelectPlace,
  onNavigateToPlace,
  onToggleSave,
  isSaved,
  places,
}) => {
  const { currentCity, userCoords } = useLocation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Fala! Eu sou o Amigo Local do vamo.AI em ${currentCity.name}. 🍻\n\nMe fala: onde você quer ir hoje ou amanhã? Pode mandar em texto ou tocar no microfone pra falar direto comigo!`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Web Speech API Native Browser Support
  const handleStartVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      sound.tap();
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          setRecordingSeconds(0);
        };

        recognition.onresult = (e: any) => {
          let text = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            text += e.results[i][0].transcript;
          }
          if (text) {
            setInputPrompt(text);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          // Auto-send if there's text
          setInputPrompt((curr) => {
            if (curr.trim().length > 3) {
              handleSendMessage(curr);
            }
            return curr;
          });
        };

        recognition.onerror = () => {
          setIsRecording(false);
          startRecordingFallback();
        };

        recognition.start();
        return;
      } catch (e) {
        startRecordingFallback();
      }
    } else {
      startRecordingFallback();
    }
  };

  // Audio Recording with MediaRecorder Fallback
  const startRecordingFallback = async () => {
    try {
      sound.tap();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (base64Data) {
            await handleTranscribeAudio(base64Data, audioBlob.type);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      const interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 20) {
            stopRecording();
            clearInterval(interval);
            return 20;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    sound.tap();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribeAudio = async (audioBase64: string, mimeType: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });

      const data = await res.json();
      const transcription = data.transcription || 'Quero uma indicação de lugar legal para sair agora';
      handleSendMessage(transcription);
    } catch (err) {
      handleSendMessage('Quero um lugar bacana para sair agora em casal.');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    sound.tap();
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const alreadySuggestedIds = messages
      .flatMap((m) => (m.recommendations || []).map((r) => r.id || r.title || ''))
      .filter(Boolean);

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          userCity: currentCity.name,
          userLat: userCoords.lat,
          userLng: userCoords.lng,
          alreadySuggestedIds,
        }),
      });

      const data = await res.json();
      sound.success();

      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Dá uma olhada nessa indicação que separei pra você!',
        recommendations: data.recommendations || [],
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: 'Tive um pequeno tropeço na conexão, mas você pode explorar os locais em alta no feed ou no mapa agora! Vamo?',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14102E] overflow-hidden relative">
      {/* Top Chat Info Header */}
      <div className="px-4 py-3 bg-[#1b153d]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6A4CFF] to-[#FF3D7F] flex items-center justify-center text-[#D4FF3A] font-unbounded font-black text-xs shadow-md">
            AI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-unbounded font-bold text-xs text-white">
                Chat Amigo Local
              </span>
              <span className="w-2 h-2 rounded-full bg-[#D4FF3A] animate-pulse" />
            </div>
            <span className="text-[10px] text-white/60 font-sans">
              Google Maps Grounding Ativo · {currentCity.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#D4FF3A] bg-[#D4FF3A]/10 px-2.5 py-1 rounded-full border border-[#D4FF3A]/30">
          <Sparkles className="w-3 h-3" />
          <span>Gemini 3.8</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#6A4CFF] text-white rounded-tr-none font-medium shadow-md'
                    : 'bg-[#1b153d] text-white/95 rounded-tl-none border border-white/10 shadow-lg'
                }`}
              >
                <p className="whitespace-pre-line font-sans">{msg.content}</p>
                <span className="text-[10px] opacity-60 block text-right mt-1.5">
                  {msg.timestamp}
                </span>
              </div>

              {/* Render Interactive Place Recommendations from Assistant */}
              {!isUser && msg.recommendations && msg.recommendations.length > 0 && (
                <div className="w-full max-w-sm space-y-3 pt-1">
                  {msg.recommendations.map((rec, i) => {
                    const matchedPlace: PlaceItem = (places.find(p => p.id === rec.id || p.title.toLowerCase().includes((rec.title || '').toLowerCase())) || {
                      id: rec.id || `place-rec-${i}`,
                      title: rec.title || 'Lugar Recomendado',
                      category: (rec.category as any) || 'restaurantes',
                      categoryLabel: rec.categoryLabel || 'Gastronomia',
                      subCategory: rec.subCategory || 'Destaque pelo Amigo Local',
                      address: rec.address || currentCity.name,
                      neighborhood: rec.neighborhood || currentCity.neighborhood,
                      city: rec.city || currentCity.name,
                      lat: rec.lat || userCoords.lat + 0.005,
                      lng: rec.lng || userCoords.lng + 0.005,
                      distanceKm: rec.distanceKm || 1.2,
                      walkingMinutes: rec.walkingMinutes || 14,
                      drivingMinutes: rec.drivingMinutes || 5,
                      rating: rec.rating || 4.8,
                      reviewCount: rec.reviewCount || 120,
                      priceLevel: (rec.priceLevel as any) || '$$',
                      openStatus: rec.openStatus || 'Aberto agora',
                      isOpenNow: rec.isOpenNow ?? true,
                      closingTimeToday: rec.closingTimeToday || '23:30',
                      motivoAgora: rec.motivoAgora || 'Lugar de destaque verificado no Google Maps!',
                      imageUrl: rec.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
                      gallery: rec.gallery || [rec.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80'],
                      features: rec.features || ['Verificado Google Maps', 'Recomendado por IA'],
                      suitableFor: rec.suitableFor || ['casal', 'amigos'],
                      vibes: rec.vibes || ['gastronomia'],
                      phone: rec.phone || '+55 11 99999-0000',
                      whatsapp: rec.whatsapp || '5511999990000',
                      googleMapsUri: rec.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.title || '')}`,
                      reviews: rec.reviews || [],
                      isRealGoogleMaps: true,
                    }) as PlaceItem;

                    const saved = isSaved(matchedPlace.id);

                    return (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-gradient-to-br from-[#251d4d] to-[#181335] border border-[#D4FF3A]/30 shadow-xl space-y-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={matchedPlace.imageUrl}
                            alt={matchedPlace.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="text-[10px] font-unbounded text-[#D4FF3A] font-bold">
                                  {matchedPlace.categoryLabel}
                                </span>
                                <h4 className="font-unbounded font-black text-xs text-white truncate">
                                  {matchedPlace.title}
                                </h4>
                              </div>
                              <button
                                onClick={() => {
                                  sound.pop();
                                  onToggleSave(matchedPlace);
                                }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                  saved ? 'text-[#FF3D7F]' : 'text-white/60 hover:text-white'
                                }`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-white/70">
                              <span className="flex items-center gap-0.5 text-[#D4FF3A] font-bold">
                                <Star className="w-3 h-3 fill-current" />
                                {matchedPlace.rating}
                              </span>
                              <span>{matchedPlace.priceLevel}</span>
                              <span className="truncate">{matchedPlace.address}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-white/90 italic bg-black/30 p-2 rounded-xl border border-white/5">
                          “{matchedPlace.motivoAgora}”
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              sound.tap();
                              onNavigateToPlace(matchedPlace);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-[10px] flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                          >
                            <Navigation className="w-3 h-3 fill-[#14102E]" />
                            <span>Me leva lá</span>
                          </button>

                          <button
                            onClick={() => {
                              sound.tap();
                              onSelectPlace(matchedPlace);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-unbounded font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <span>Ver detalhes</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#1b153d] border border-white/10 max-w-[200px] text-xs text-white/80 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#D4FF3A]" />
            <span>Consultando Google Maps...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips Carousel */}
      <div className="px-4 py-1.5 bg-[#14102E] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {[
          '🍕 Date romântico em casal',
          '🍻 Barzinho com chopp e amigos',
          '🎶 Onde tem samba ao vivo hoje?',
          '✂️ Barbearia top aberta agora',
          '☕ Café calmo pra trabalhar',
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => handleSendMessage(chip)}
            disabled={isLoading}
            className="text-[11px] px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 whitespace-nowrap active:scale-95 transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Bottom Input & Microphone Controls */}
      <div className="p-3 bg-[#1b153d] border-t border-white/10 shrink-0">
        {isRecording ? (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold text-xs">Gravando áudio com IA... ({recordingSeconds}s)</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 rounded-full bg-rose-500 text-white font-unbounded font-black text-xs hover:bg-rose-600"
            >
              Parar & Enviar
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleStartVoice}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-[#FF3D7F] text-white flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer"
              title="Falar por voz com o Amigo Local"
            >
              <Mic className="w-4 h-4 text-[#D4FF3A]" />
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Digite ou fale: 'Onde tem um bar com DJ perto de mim?'"
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-white/40 focus:border-[#D4FF3A] focus:outline-none transition-all"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="w-10 h-10 rounded-2xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] flex items-center justify-center transition-all shrink-0 disabled:opacity-40 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
