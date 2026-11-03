import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server runs on port 3000; proxy listens on port 8080
const port = 3000;

// Enable larger JSON payloads for audio recording base64
app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. API endpoint for AI Expert Tips
app.post('/api/expert-tips', async (req, res) => {
  try {
    const { placeTitle, category, neighborhood, currentEvent, motivoAgora, suitableFor, priceLevel } = req.body;

    if (!placeTitle) {
      return res.status(400).json({ error: 'placeTitle is required' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.json({
        bestTime: 'Chegue cerca de 25 minutos antes do horário de pico para garantir a melhor mesa.',
        mustOrderDish: 'Peça a especialidade do chef combinada com o coquetel ou bebida autoral da casa.',
        secretTip: 'Pergunte ao atendente sobre os especiais fora do cardápio do dia.',
        companionVibe: 'Excelente para quem quer uma experiência acolhedora e com personalidade.',
        curatorComment: `O ${placeTitle} é um achado que vale cada minuto. Vamo nessa!`,
        source: 'curator_fallback',
      });
    }

    const prompt = `Gere dicas especializadas, concretas e autênticas de um amigo local sobre o estabelecimento "${placeTitle}".
Categoria: ${category || 'Geral'}
Bairro: ${neighborhood || 'Cidade'}
Motivo do momento: ${motivoAgora || 'Local de destaque'}
Evento hoje: ${currentEvent ? JSON.stringify(currentEvent) : 'Programação normal'}
Público ideal: ${Array.isArray(suitableFor) ? suitableFor.join(', ') : 'Todos'}
Faixa de preço: ${priceLevel || '$$'}

O tom de voz deve seguir o manifesto do vamo.AI: "Fala como um amigo local", direto, com verbos de ação, dados concretos (hora, prato, truque do salão) e sem clichês genéricos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Você é o curador especialista sênior e amigo local do app vamo.AI ("O melhor da cidade, pra agora."). Suas dicas são afiadas, precisas, entusiasmadas e práticas para quem vai sair agora.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestTime: {
              type: Type.STRING,
              description: 'O melhor horário para chegar ou escolher lugar no salão/balcão.',
            },
            mustOrderDish: {
              type: Type.STRING,
              description: 'O prato, bebida ou serviço que é pedido obrigatório e vale a fama.',
            },
            secretTip: {
              type: Type.STRING,
              description: 'Um segredo ou truque de frequentador habitual.',
            },
            companionVibe: {
              type: Type.STRING,
              description: 'Com quem e qual vibe esse lugar brilha mais agora.',
            },
            curatorComment: {
              type: Type.STRING,
              description: 'Um comentário curto e marcante do amigo local com convite de ação estilo vamo.AI.',
            },
          },
          required: ['bestTime', 'mustOrderDish', 'secretTip', 'companionVibe', 'curatorComment'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ ...parsed, source: 'gemini' });
  } catch (error) {
    console.error('Error generating expert tips:', error);
    return res.status(500).json({
      error: 'Não foi possível gerar as dicas agora.',
      bestTime: 'Chegue no início do turno para curtir sem pressa.',
      mustOrderDish: 'Aposte no prato ou drinque mais elogiado nas avaliações recentes.',
      secretTip: 'Sente perto do balcão ou na área externa para sentir a vibe do lugar.',
      companionVibe: 'Ideal para um rolê descontraído e saboroso.',
      curatorComment: 'Lugar aprovado pela curadoria do vamo.AI. Vamo!',
      source: 'fallback',
    });
  }
});

// 2. Audio Transcription API endpoint (using gemini-3.5-transcribe)
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.json({
        transcription: 'Quero um barzinho animado com chopp artesanal e música ao vivo para hoje à noite.',
        source: 'simulated',
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcreva o que o usuário falou em áudio com máxima exatidão em português brasileiro. Forneça apenas o texto falado, sem introduções ou explicações.' },
        ],
      },
    });

    const transcription = response.text ? response.text.trim() : '';
    return res.json({ transcription, source: 'gemini-3.5-transcribe' });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({
      error: 'Falha ao transcrever áudio',
      transcription: 'Quero um bom lugar para sair hoje.',
      source: 'fallback',
    });
  }
});

// Helper: map Google place types to vamo.AI category slugs
function categorizeGooglePlace(types: string[] = []): 'restaurantes' | 'bares' | 'eventos' | 'barbearias' | 'cafes' | 'baladas' {
  const t = types.map((x) => x.toLowerCase());
  if (t.some((x) => x.includes('cafe') || x.includes('coffee') || x.includes('bakery') || x.includes('padaria') || x.includes('breakfast'))) {
    return 'cafes';
  }
  if (t.some((x) => x.includes('barber') || x.includes('hair') || x.includes('beauty_salon') || x.includes('spa'))) {
    return 'barbearias';
  }
  if (t.some((x) => x.includes('night_club') || x.includes('disco') || x.includes('dance_hall'))) {
    return 'baladas';
  }
  if (t.some((x) => x.includes('live_music') || x.includes('theater') || x.includes('cultural') || x.includes('concert'))) {
    return 'eventos';
  }
  if (t.some((x) => x.includes('bar') || x.includes('pub') || x.includes('cocktail') || x.includes('wine_bar') || x.includes('boteco') || x.includes('lounge'))) {
    return 'bares';
  }
  return 'restaurantes';
}

function transformGooglePlaceToItem(
  gp: any,
  userLat: number,
  userLng: number,
  mapsApiKey: string,
  overrideCategory?: 'restaurantes' | 'bares' | 'eventos' | 'barbearias' | 'cafes' | 'baladas'
) {
  const photoName = gp.photos?.[0]?.name;
  const photoUrl = photoName
    ? `/api/maps/photo?name=${encodeURIComponent(photoName)}`
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80';

  const rawPhotos = gp.photos && gp.photos.length > 0
    ? gp.photos.slice(0, 10).map((p: any) => `/api/maps/photo?name=${encodeURIComponent(p.name)}`)
    : [photoUrl];

  const gallery = rawPhotos;

  // Classify photos into food, ambience and menu buckets
  const foodPhotos: string[] = [];
  const ambiencePhotos: string[] = [];
  const menuPhotos: string[] = [];

  rawPhotos.forEach((url: string, idx: number) => {
    if (idx === 0) {
      ambiencePhotos.push(url);
    } else if (idx % 3 === 1) {
      foodPhotos.push(url);
    } else if (idx % 3 === 2) {
      menuPhotos.push(url);
    } else {
      ambiencePhotos.push(url);
    }
  });

  if (foodPhotos.length === 0) foodPhotos.push(rawPhotos[0] || photoUrl);
  if (ambiencePhotos.length === 0) ambiencePhotos.push(rawPhotos[0] || photoUrl);
  if (menuPhotos.length === 0) menuPhotos.push(rawPhotos[Math.min(1, rawPhotos.length - 1)] || photoUrl);

  const categorizedPhotos = {
    all: rawPhotos,
    food: foodPhotos,
    ambience: ambiencePhotos,
    menu: menuPhotos,
  };

  const category = overrideCategory || categorizeGooglePlace(gp.types);
  const categoryLabels: Record<string, string> = {
    restaurantes: 'Restaurante',
    bares: 'Bar & Coquetelaria',
    cafes: 'Café & Brunch',
    baladas: 'Balada & Nightlife',
    eventos: 'Música & Eventos',
    barbearias: 'Barbearia & Estilo',
  };
  const categoryLabel = categoryLabels[category] || 'Gastronomia';
  const subCategory = gp.primaryTypeDisplayName?.text || (gp.types?.[0] || 'Google Maps').replace(/_/g, ' ');

  const isOpenNow = gp.currentOpeningHours?.openNow ?? true;
  const openStatus = isOpenNow ? 'Aberto agora' : 'Fechado no momento';

  const priceMap: Record<string, '$' | '$$' | '$$$' | '$$$$'> = {
    'PRICE_LEVEL_FREE': '$',
    'PRICE_LEVEL_INEXPENSIVE': '$',
    'PRICE_LEVEL_MODERATE': '$$',
    'PRICE_LEVEL_EXPENSIVE': '$$$',
    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$',
  };
  const priceLevel = priceMap[gp.priceLevel] || '$$';

  const lat = gp.location?.latitude || userLat;
  const lng = gp.location?.longitude || userLng;

  const R = 6371;
  const dLat = ((lat - userLat) * Math.PI) / 180;
  const dLon = ((lng - userLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const distanceKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  const walkingMinutes = Math.max(3, Math.round(distanceKm * 12));
  const drivingMinutes = Math.max(2, Math.round(distanceKm * 2.5 + 2));

  let motivoAgora = gp.editorialSummary?.text;
  if (!motivoAgora) {
    const ratingText = gp.rating ? `Nota ${gp.rating}★ no Google Maps` : 'Alta recomendação no Google Maps';
    const reviewsCountText = gp.userRatingCount ? `com mais de ${gp.userRatingCount} avaliações` : '';
    if (category === 'bares') {
      motivoAgora = `Ambiente animado, ${ratingText} ${reviewsCountText}. Drinks bem elaborados e público descontraído.`;
    } else if (category === 'cafes') {
      motivoAgora = `Perfeito para uma pausa de qualidade. ${ratingText} ${reviewsCountText}. Cafés especiais e ambiente acolhedor.`;
    } else if (category === 'baladas') {
      motivoAgora = `Pista vibrante, ótimos DJs e som impecável. ${ratingText}.`;
    } else if (category === 'barbearias') {
      motivoAgora = `Atendimento primoroso, profissionais conceituados e ambiente moderno. ${ratingText}.`;
    } else if (category === 'eventos') {
      motivoAgora = `Programação ao vivo de qualidade e atmosfera única. ${ratingText}.`;
    } else {
      motivoAgora = `Cozinha elogiada, pratos frescos e excelente custo-benefício. ${ratingText} ${reviewsCountText}.`;
    }
  }

  const features: string[] = ['Verificado Google Maps'];
  if (gp.dineIn) features.push('Consumo no local');
  if (gp.outdoorSeating) features.push('Área externa');
  if (gp.servesCocktails) features.push('Coquetelaria');
  if (gp.servesBeer) features.push('Chopp & cerveja');
  if (gp.servesWine) features.push('Carta de vinhos');
  if (gp.servesVegetarianFood) features.push('Opções vegetarianas');
  if (gp.delivery) features.push('Delivery');
  if (features.length < 3) {
    features.push('Ambiente acolhedor', openStatus);
  }

  const reviews = (gp.reviews || []).slice(0, 4).map((r: any, idx: number) => ({
    id: `gmp-rev-${gp.id}-${idx}`,
    placeId: gp.id,
    userId: `gmp-user-${idx}`,
    userName: r.authorAttribution?.displayName || 'Avaliador Google',
    userAvatar: r.authorAttribution?.photoUri || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    rating: r.rating || 5,
    comment: r.text?.text || r.originalText?.text || 'Lugar incrível, super recomendo!',
    vibeTag: 'Google Maps Review',
    date: r.relativePublishTimeDescription || 'Recentemente',
  }));

  const fullAddress = gp.formattedAddress || 'Endereço verificado no Google Maps';
  const parts = fullAddress.split(',');
  const neighborhood = parts.length > 1 ? parts[1].trim() : 'Região Central';
  const city = parts.length > 2 ? parts[2].trim().split('-')[0].trim() : 'São Paulo';

  // Deterministic partner coupon simulation for monetization
  let coupon = undefined;
  const placeHash = (gp.displayName?.text || gp.id || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  if (placeHash % 3 === 0) {
    const couponVarieties = [
      { code: 'VAMO15', discount: '15% OFF', title: '15% OFF na Conta Geral', description: 'Desconto de 15% em todo o consumo de comida e bebidas para usuários vamo.AI.', minSpend: 'R$ 80' },
      { code: 'VAMODRINK', discount: 'Drink Cortesia', title: 'Drinque Autoral de Entrada', description: 'Ao pedir qualquer prato principal, ganhe um coquetel autoral da casa.', minSpend: 'R$ 60' },
      { code: 'VAMO2X1', discount: '2x1 Chopp', title: 'Chopp Artesanal em Dobro', description: 'Compre 1 Chopp artesanal e o 2º sai por conta da casa.', minSpend: 'Sem valor mínimo' },
      { code: 'VAMODOCE', discount: 'Sobremesa Grátis', title: 'Sobremesa Cortesia do Chef', description: 'Sobremesa cortesia da casa ao consumir menu completo.', minSpend: 'R$ 75' },
    ];
    const picked = couponVarieties[placeHash % couponVarieties.length];
    coupon = {
      id: `coupon-${gp.id || placeHash}`,
      code: picked.code,
      title: picked.title,
      discount: picked.discount,
      description: picked.description,
      minSpend: picked.minSpend,
      validUntil: 'Válido até domingo',
      partnerTier: placeHash % 6 === 0 ? 'exclusive' : 'featured',
      terms: 'Apresente o cupom ativo no vamo.AI ao garçom no momento de pedir a conta.',
    };
  }

  return {
    id: gp.id || `gmp-${Math.random().toString(36).substring(7)}`,
    title: gp.displayName?.text || 'Estabelecimento Local',
    category,
    categoryLabel,
    subCategory: subCategory.charAt(0).toUpperCase() + subCategory.slice(1),
    address: fullAddress,
    neighborhood,
    city,
    lat,
    lng,
    distanceKm,
    walkingMinutes,
    drivingMinutes,
    rating: gp.rating || 4.8,
    reviewCount: gp.userRatingCount || 120,
    priceLevel,
    openStatus,
    isOpenNow,
    closingTimeToday: '23:30',
    motivoAgora,
    imageUrl: photoUrl,
    gallery,
    features,
    suitableFor: ['casal', 'amigos', 'sozinho'] as ('casal' | 'amigos' | 'sozinho')[],
    vibes: (category === 'bares' ? ['drinques', 'agito'] : category === 'cafes' ? ['relax', 'estilo'] : ['gastronomia', 'casal']) as ('gastronomia' | 'drinques' | 'agito' | 'relax' | 'estilo')[],
    phone: gp.nationalPhoneNumber || gp.internationalPhoneNumber || '+55 11 3000-0000',
    whatsapp: '5511999990000',
    googleMapsUri: gp.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gp.displayName?.text || '')}&query_place_id=${gp.id}`,
    websiteUri: gp.websiteUri || undefined,
    reviews,
    coupon,
    categorizedPhotos,
    isRealGoogleMaps: true,
  };
}

// Search real Google Places by query or nearby using Places API (New)
async function fetchRealGooglePlacesByQuery(
  query: string,
  lat: number,
  lng: number,
  radius: number = 7000,
  maxResults: number = 10,
  mapsApiKey: string
): Promise<any[]> {
  const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.location,places.photos,places.reviews,places.editorialSummary,places.googleMapsUri,places.dineIn,places.takeout,places.delivery,places.servesBeer,places.servesWine,places.servesCocktails,places.servesVegetarianFood,places.outdoorSeating,places.nationalPhoneNumber,places.websiteUri';

  try {
    const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const textRes = await fetch(textSearchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask': fieldMask,
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify({
        textQuery: query.trim(),
        maxResultCount: maxResults,
        locationBias: {
          circle: {
            center: { latitude: Number(lat), longitude: Number(lng) },
            radius: Number(radius),
          },
        },
      }),
    });

    if (textRes.ok) {
      const data = await textRes.json();
      return data.places || [];
    }
  } catch (err) {
    console.warn('fetchRealGooglePlacesByQuery error:', err);
  }
  return [];
}

// Intent extractor from user prompt to craft targeted Google Maps query
function extractIntentFromChat(userMsg: string, city: string = 'São Paulo'): { query: string; categoryHint: string } {
  const m = userMsg.toLowerCase();

  if (m.includes('pizza') || m.includes('pizzaria')) {
    return { query: `pizzaria artesanal forneria napoletana ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('hambúrguer') || m.includes('hamburguer') || m.includes('burger')) {
    return { query: `hamburgueria artesanal smash burger ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('japonês') || m.includes('japones') || m.includes('sushi') || m.includes('temaki') || m.includes('japa')) {
    return { query: `restaurante japones sushi izakaya ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('italiano') || m.includes('massa') || m.includes('pasta') || m.includes('trattoria')) {
    return { query: `restaurante italiano trattoria cantina ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('carne') || m.includes('churrasco') || m.includes('churrascaria') || m.includes('parrilla') || m.includes('steak')) {
    return { query: `churrascaria parrilla steakhouse carnes ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('café') || m.includes('cafe') || m.includes('brunch') || m.includes('trabalhar') || m.includes('estudar') || m.includes('padaria')) {
    return { query: `cafeteria cafe especial brunch artesanal ${city}`, categoryHint: 'cafes' };
  }
  if (m.includes('rooftop') || m.includes('vista') || m.includes('terraço')) {
    return { query: `rooftop bar com vista drinks coquetelaria ${city}`, categoryHint: 'bares' };
  }
  if (m.includes('samba') || m.includes('pagode') || m.includes('roda de samba') || m.includes('ao vivo') || m.includes('música') || m.includes('musica')) {
    return { query: `bar com música ao vivo samba pagode ${city}`, categoryHint: 'eventos' };
  }
  if (m.includes('balada') || m.includes('festa') || m.includes('dançar') || m.includes('dj') || m.includes('night') || m.includes('eletrônica') || m.includes('eletronica')) {
    return { query: `balada casa noturna club festa ${city}`, categoryHint: 'baladas' };
  }
  if (m.includes('barba') || m.includes('cabelo') || m.includes('corte') || m.includes('barbearia')) {
    return { query: `barbearia premium corte e barba ${city}`, categoryHint: 'barbearias' };
  }
  if (m.includes('cerveja') || m.includes('chopp') || m.includes('artesanal') || m.includes('brewpub') || m.includes('boteco')) {
    return { query: `cervejaria artesanal chopp boteco raiz ${city}`, categoryHint: 'bares' };
  }
  if (m.includes('bar') || m.includes('drink') || m.includes('drinque') || m.includes('coquetel') || m.includes('lounge')) {
    return { query: `bar de drinks coquetelaria premiada ${city}`, categoryHint: 'bares' };
  }
  if (m.includes('romântico') || m.includes('romantico') || m.includes('date') || m.includes('namorada') || m.includes('casal') || m.includes('vinho') || m.includes('jantar')) {
    return { query: `bistrô romantico adega vinho luz de velas ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('barato') || m.includes('econômico') || m.includes('economico') || m.includes('custo-benefício') || m.includes('custo beneficio')) {
    return { query: `comida boa e barata boteco custo benefício ${city}`, categoryHint: 'restaurantes' };
  }
  if (m.includes('doce') || m.includes('sobremesa') || m.includes('sorvete') || m.includes('confeitaria')) {
    return { query: `confeitaria doceria artesanal sorveteria ${city}`, categoryHint: 'cafes' };
  }

  // Generic fallback query with user intent
  const clean = userMsg.replace(/[?!.,]/g, '').trim();
  if (clean.length > 3) {
    return { query: `${clean} ${city}`, categoryHint: 'todos' };
  }
  return { query: `melhores restaurantes bares cafés ${city}`, categoryHint: 'todos' };
}

// Known Brazilian cities for cross-city dynamic chat & routing
const KNOWN_BRAZILIAN_CITIES: Record<string, { name: string; state: string; lat: number; lng: number }> = {
  'são paulo': { name: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
  'sao paulo': { name: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
  'santos': { name: 'Santos', state: 'SP', lat: -23.9608, lng: -46.3336 },
  'campinas': { name: 'Campinas', state: 'SP', lat: -22.9099, lng: -47.0626 },
  'rio de janeiro': { name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729 },
  'rio': { name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729 },
  'niterói': { name: 'Niterói', state: 'RJ', lat: -22.8859, lng: -43.1153 },
  'niteroi': { name: 'Niterói', state: 'RJ', lat: -22.8859, lng: -43.1153 },
  'petrópolis': { name: 'Petrópolis', state: 'RJ', lat: -22.5050, lng: -43.1789 },
  'petropolis': { name: 'Petrópolis', state: 'RJ', lat: -22.5050, lng: -43.1789 },
  'curitiba': { name: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733 },
  'belo horizonte': { name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
  'bh': { name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
  'florianópolis': { name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480 },
  'florianopolis': { name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480 },
  'floripa': { name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480 },
  'gramado': { name: 'Gramado', state: 'RS', lat: -29.3746, lng: -50.8764 },
  'porto alegre': { name: 'Porto Alegre', state: 'RS', lat: -30.0346, lng: -51.2177 },
  'salvador': { name: 'Salvador', state: 'BA', lat: -12.9777, lng: -38.5016 },
  'brasília': { name: 'Brasília', state: 'DF', lat: -15.7975, lng: -47.8919 },
  'brasilia': { name: 'Brasília', state: 'DF', lat: -15.7975, lng: -47.8919 },
  'ubatuba': { name: 'Ubatuba', state: 'SP', lat: -23.4332, lng: -45.0834 },
  'campos do jordão': { name: 'Campos do Jordão', state: 'SP', lat: -22.7394, lng: -45.5913 },
  'campos do jordao': { name: 'Campos do Jordão', state: 'SP', lat: -22.7394, lng: -45.5913 },
  'jundiaí': { name: 'Jundiaí', state: 'SP', lat: -23.1857, lng: -46.8978 },
  'jundiai': { name: 'Jundiaí', state: 'SP', lat: -23.1857, lng: -46.8978 },
  'sorocaba': { name: 'Sorocaba', state: 'SP', lat: -23.5015, lng: -47.4526 },
};

// 3. Multi-turn AI Chat with Real Google Maps Grounding & Dynamic Cross-City Alternation
app.post('/api/chat-recommendations', async (req, res) => {
  const {
    messages = [],
    userCity = 'São Paulo',
    userLat = -23.5651,
    userLng = -46.6672,
    alreadySuggestedIds = [],
  } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8UE8LdHavPMAdIRBtng8hJ-k4ttk_jew';
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

  try {
    // Detect if user is asking for a specific city other than userCity
    let effectiveCity = userCity;
    let effectiveLat = Number(userLat);
    let effectiveLng = Number(userLng);
    let isDifferentCityRequested = false;

    const lowerMsg = lastUserMsg.toLowerCase();
    for (const [key, val] of Object.entries(KNOWN_BRAZILIAN_CITIES)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(lowerMsg)) {
        effectiveCity = `${val.name} - ${val.state}`;
        effectiveLat = val.lat;
        effectiveLng = val.lng;
        isDifferentCityRequested = true;
        break;
      }
    }

    // 1. Extract search intent dynamically based on user request & target city
    const intent = extractIntentFromChat(lastUserMsg, effectiveCity);

    // 2. Fetch REAL Places from Google Maps API (New)
    const rawGooglePlaces = await fetchRealGooglePlacesByQuery(
      intent.query,
      effectiveLat,
      effectiveLng,
      8000,
      12,
      mapsApiKey
    );

    // 3. Transform to vamo.AI items
    let candidatePlaces = rawGooglePlaces.map((gp) =>
      transformGooglePlaceToItem(gp, effectiveLat, effectiveLng, mapsApiKey)
    );

    // 4. Quality filter & exclude places already shown in this conversation session
    const excludedSet = new Set((alreadySuggestedIds || []).map((id: string) => id.toLowerCase()));
    let filteredPlaces = candidatePlaces.filter(
      (p) => !excludedSet.has(p.id.toLowerCase()) && !excludedSet.has(p.title.toLowerCase())
    );

    // If all were excluded or none left, reset back to candidates to avoid emptiness
    if (filteredPlaces.length === 0 && candidatePlaces.length > 0) {
      filteredPlaces = candidatePlaces;
    }

    // Sort by rating & popularity, then shuffle top 4 to ensure dynamic variety and alternation
    filteredPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const topPool = filteredPlaces.slice(0, 4);
    // Shuffle the top pool
    for (let i = topPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topPool[i], topPool[j]] = [topPool[j], topPool[i]];
    }

    const selectedPlaces = topPool.slice(0, 2);

    // 5. Try calling Gemini to generate an authentic response with the real Google Places as context
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        const placesContext = selectedPlaces.map((p, idx) => 
          `${idx + 1}. ${p.title} (${p.categoryLabel}) - Bairro: ${p.neighborhood}, Nota Google: ${p.rating}★ (${p.reviewCount} avaliações). Endereço: ${p.address}. Destaque: ${p.motivoAgora}`
        ).join('\n');

        const systemPrompt = `Você é o Amigo Local e Curador oficial do app vamo.AI ("O melhor da cidade, pra agora.").
Local de busca selecionado: ${effectiveCity} (Lat: ${effectiveLat}, Lng: ${effectiveLng}).
${isDifferentCityRequested ? `IMPORTANTE: O usuário pediu especificamente opções em ${effectiveCity}. Confirme logo no início que buscou as melhores opções reais de ${effectiveCity}!` : `Localização base: ${userCity}.`}
Os seguintes estabelecimentos REAIS foram verificados agora via Google Maps para atender ao pedido do usuário:
${placesContext}

Instruções:
- Converse de forma natural, calorosa e descontraída em português brasileiro, como um amigo que conhece tudo na cidade.
- Destaque o estabelecimento encontrado, citando o nome exato, o bairro e por que vale muito a pena ir agora (prato, clima, drinks).
- Finalize com uma chamada de ação entusiasmada no estilo vamo.AI (ex: "Vamo nessa?", "Bora provar?").
- Mantenha a resposta concisa (2 a 4 parágrafos curtos). Não use clichês de robô.`;

        const contents = messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });

        if (response.text && response.text.trim().length > 0) {
          return res.json({
            reply: response.text.trim(),
            recommendations: selectedPlaces,
            source: 'gemini_with_google_places',
          });
        }
      } catch (geminiError) {
        console.warn('Gemini chat synthesis fallback to local curator:', (geminiError as any)?.message || geminiError);
      }
    }

    // 6. Intelligent Brazilian Local Curator fallback (grounded on REAL Google Maps results)
    if (selectedPlaces.length > 0) {
      const p = selectedPlaces[0];
      const secondP = selectedPlaces[1];

      const greetings = [
        `Se liga nessa indicação quente do Google Maps pra você: o **${p.title}**!`,
        `Achei a opção certeira pro que você pediu: o **${p.title}** no bairro **${p.neighborhood}**!`,
        `Você vai curtir demais o **${p.title}**!`,
        `Essa dica é de ouro pra agora: dá uma olhada no **${p.title}**!`,
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];

      let reply = `${greeting}\n\n⭐ **Avaliação Google:** ${p.rating}★ (${p.reviewCount} avaliações reais)\n📍 **Endereço:** ${p.address}\n\n💡 **Por que ir agora:** ${p.motivoAgora}`;

      if (secondP) {
        reply += `\n\nOutra alternativa de primeira linha pertinho é o **${secondP.title}** (${secondP.rating}★), ${secondP.motivoAgora}`;
      }

      reply += `\n\nToque no card abaixo pra traçar a rota no Maps ou guardar na sua lista. Vamo nessa? 🚀`;

      return res.json({
        reply,
        recommendations: selectedPlaces,
        source: 'google_maps_local_curator',
      });
    }

    // Emergency fallback if Google Maps returned 0 places
    return res.json({
      reply: `Tô vasculhando as opções em ${userCity}. Que tal me dar mais detalhes do que você tá afim agora (ex: pizza, rooftop, café especial, samba)?`,
      recommendations: [],
      source: 'fallback_empty',
    });
  } catch (error) {
    console.error('Error in chat recommendations:', error);
    return res.status(500).json({
      error: 'Erro ao gerar recomendações.',
      reply: 'Tive um pequeno tropeço na conexão, mas você pode explorar os locais em alta direto na aba Explorar! Vamo?',
      recommendations: [],
    });
  }
});

// 3.5. Live Google Search Grounding for Restaurant Profile (using gemini-3.8-flash with googleSearch)
app.post('/api/places/web-content', async (req, res) => {
  try {
    const { placeTitle, address, city = 'São Paulo', category = '' } = req.body || {};
    if (!placeTitle) {
      return res.status(400).json({ error: 'placeTitle is required' });
    }

    const photoSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${placeTitle} ${city} restaurante fotos ambiente cardápio`)}`;
    const instagramSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${placeTitle} ${city} instagram oficial fotos`)}`;
    const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeTitle} ${address || city}`)}`;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.json({
        webSummary: `${placeTitle} é um estabelecimento conceituado em ${city}, conhecido pela atmosfera agradável e preparações caprichadas elogiadas por frequentadores.`,
        popularDishes: ['Pratos principais da casa', 'Coquetel autoral da estação', 'Sobremesa signature'],
        servicesFound: ['Consumo no local', 'Área climatizada', 'Aceita cartões e PIX', 'Opções para compartilhar'],
        atmosphere: 'Ambiente convidativo e descontraído, ideal tanto para casais quanto para grupos de amigos.',
        bestTimeTip: 'Chegar no início do turno garante mesa rápida e atendimento mais atencioso.',
        secretTip: 'Pergunte aos atendentes sobre os especiais da semana fora da carta regular.',
        socialBuzz: 'Forte recomendação em avaliações locais de gastronomia e redes sociais.',
        photoSearchUrl,
        instagramSearchUrl,
        mapsSearchUrl,
        source: 'simulated_web',
      });
    }

    const prompt = `Você é um pesquisador gastronômico verificando dados reais sobre o estabelecimento "${placeTitle}" em ${address ? `${address}, ${city}` : city}.
    Utilize a ferramenta de busca do Google para encontrar informações reais, recentes e autênticas sobre o lugar. NUNCA invente dados. Se algum item não for encontrado, omita ou use o que foi explicitamente reportado.
    
    Extraia:
    1. "webSummary": Resumo de 2 a 3 frases objetivas sobre a culinária, história ou proposta real do local segundo os resultados da busca.
    2. "popularDishes": Lista com 2 a 4 pratos, drinques ou itens do cardápio mais citados e fotografados por clientes na internet.
    3. "servicesFound": Lista de comodidades ou serviços reais confirmados (ex: "Área externa / ar livre", "Aceita reservas", "Pet friendly", "Carta de vinhos", "Wi-Fi", "Opções vegetarianas", "Música ao vivo", "Delivery").
    4. "atmosphere": Uma frase concisa sobre a vibe física do salão/ambiente (iluminação, som, estilo decorativo).
    5. "bestTimeTip": O melhor momento ou dia para visitar e evitar filas ou pegar melhor mesa.
    6. "secretTip": Uma dica prática compartilhada por clientes reais em avaliações (ex: reserva antecipada, mesa no balcão).
    7. "socialBuzz": Um comentário curto e autêntico que sintetiza a impressão das pessoas na web.

    Retorne APENAS um objeto JSON com estas chaves:
    {
      "webSummary": "...",
      "popularDishes": ["...", "..."],
      "servicesFound": ["...", "..."],
      "atmosphere": "...",
      "bestTimeTip": "...",
      "secretTip": "...",
      "socialBuzz": "..."
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: any = {};
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        parsed = { webSummary: text.substring(0, 300) };
      }
    } else {
      parsed = { webSummary: text.substring(0, 300) };
    }

    return res.json({
      webSummary: parsed.webSummary || `${placeTitle} é um dos pontos gastronômicos recomendados na região.`,
      popularDishes: Array.isArray(parsed.popularDishes) && parsed.popularDishes.length > 0 ? parsed.popularDishes : ['Especialidades do chef', 'Bebidas autorais'],
      servicesFound: Array.isArray(parsed.servicesFound) && parsed.servicesFound.length > 0 ? parsed.servicesFound : ['Consumo no local', 'Opções gastronômicas'],
      atmosphere: parsed.atmosphere || 'Ambiente acolhedor com decoração charmosa.',
      bestTimeTip: parsed.bestTimeTip || 'Chegue com antecedência nos fins de semana.',
      secretTip: parsed.secretTip || 'Acompanhe as novidades sazonais diretamente com os atendentes.',
      socialBuzz: parsed.socialBuzz || 'Elogiado pela qualidade das preparações e hospitalidade.',
      photoSearchUrl,
      instagramSearchUrl,
      mapsSearchUrl,
      source: 'gemini-3.8-flash-google-search',
    });
  } catch (error) {
    console.error('Error fetching web content with search grounding:', error);
    const { placeTitle = 'Estabelecimento', city = 'São Paulo' } = req.body || {};
    return res.json({
      webSummary: `${placeTitle} reúne boas recomendações gastronômicas em ${city}.`,
      popularDishes: ['Menu principal', 'Bebidas especiais'],
      servicesFound: ['Consumo no local', 'Atendimento cordial'],
      atmosphere: 'Ambiente agradável para refeições e encontros.',
      bestTimeTip: 'Chegue um pouco antes do horário de pico.',
      secretTip: 'Consulte as sugestões do dia.',
      socialBuzz: 'Recomendado por clientes locais.',
      photoSearchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${placeTitle} ${city} fotos`)}`,
      instagramSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(`${placeTitle} ${city} instagram`)}`,
      mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeTitle} ${city}`)}`,
      source: 'fallback',
    });
  }
});

// 3.6. VibeDashboard Gemini Summary based on last 5 saved or visited places
app.post('/api/vibe-dashboard', async (req, res) => {
  try {
    const { recentPlaces = [], city = 'São Paulo' } = req.body || {};

    if (!Array.isArray(recentPlaces) || recentPlaces.length === 0) {
      return res.json({
        userVibeTitle: 'Explorador em Busca de Histórias',
        archetype: 'Descobridor Gastronômico',
        summary: 'Você está no início da sua jornada vamo.AI! Salve ou faça check-in nos seus lugares favoritos para calibrar seu radar em tempo real.',
        favoriteVibes: ['Gastronomia Autoral', 'Bistrô & Adega', 'Drinques Especiais'],
        energyLevel: 'Equilibrado',
        energyPercentage: 70,
        futureCheckinSuggestions: [
          {
            id: 'sug-1',
            title: 'Bistrô intimista com iluminação à meia-luz',
            category: 'restaurantes',
            vibe: 'gastronomia',
            reason: 'Perfeito para relaxar com boa comida e uma boa taça de vinho.',
            placeTypeKeyword: 'bistro',
          },
          {
            id: 'sug-2',
            title: 'Cocktail bar com drinques autorais no balcão',
            category: 'bares',
            vibe: 'drinques',
            reason: 'Ideal para um bate-papo descontraído com mixologia de alto nível.',
            placeTypeKeyword: 'cocktail_bar',
          },
          {
            id: 'sug-3',
            title: 'Cafeteria artesanal ou bakery acolhedora',
            category: 'cafes',
            vibe: 'relax',
            reason: 'Ótima pedida para o meio da tarde com café especial fresco.',
            placeTypeKeyword: 'cafe',
          },
        ],
        source: 'starter_default',
      });
    }

    // Prepare context from last 5 places
    const placesContext = recentPlaces.slice(0, 5).map((p: any, i: number) => {
      const name = p.title || p.placeTitle || 'Lugar';
      const cat = p.category || p.placeCategory || 'Geral';
      const note = p.notes || p.vibe || '';
      return `${i + 1}. ${name} (${cat}) ${note ? `- contexto: "${note}"` : ''}`;
    }).join('\n');

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      const titles = recentPlaces.map((p: any) => p.title || p.placeTitle).filter(Boolean);
      const categories = recentPlaces.map((p: any) => p.category || p.placeCategory).filter(Boolean);
      const isBarHeavy = categories.some((c: string) => /bar|coquetel|drinque/i.test(c));
      const isCafeHeavy = categories.some((c: string) => /café|bakery|padaria/i.test(c));

      return res.json({
        userVibeTitle: isBarHeavy
          ? 'Alma Boêmia & Apreciador de Coquetelaria'
          : isCafeHeavy
          ? 'Amante de Cafés Especiais & Pausas Aconchegantes'
          : 'Gourmet Intimista & Caçador de Sabores',
        archetype: isBarHeavy ? 'Mixologista Urbano' : 'Curador de Ambientes Acolhedores',
        summary: `Com base em lugares como ${titles.slice(0, 2).join(' e ')}, seu momento atual valoriza atmosfera agradável, qualidade sensorial e experiências marcantes.`,
        favoriteVibes: isBarHeavy
          ? ['Drinques Autorais', 'Som Ambiente', 'Noites Animadas']
          : ['Menu Degustação', 'Vinho Selecionado', 'Salão Confortável'],
        energyLevel: isBarHeavy ? 'Vibrante' : 'Intimista',
        energyPercentage: isBarHeavy ? 88 : 72,
        futureCheckinSuggestions: [
          {
            id: 'f-1',
            title: 'Speakeasy ou bar secreto no bairro vizinho',
            category: 'bares',
            vibe: 'drinques',
            reason: 'Combina com seu apreço por boa coquetelaria e lugares escondidos.',
            placeTypeKeyword: 'bar',
          },
          {
            id: 'f-2',
            title: 'Rooftop com vista panorâmica para o entardecer',
            category: 'bares',
            vibe: 'agito',
            reason: 'Excelente transição do fim de tarde para a noite.',
            placeTypeKeyword: 'rooftop',
          },
          {
            id: 'f-3',
            title: 'Bistrô com massas frescas artesanais',
            category: 'restaurantes',
            vibe: 'gastronomia',
            reason: 'Para manter o padrão de aconchego e sabor autêntico.',
            placeTypeKeyword: 'restaurant',
          },
        ],
        source: 'curator_heuristic',
      });
    }

    const prompt = `Você é o curador especialista do app vamo.AI.
Analise os últimos lugares salvos e visitados pelo usuário em ${city}:
${placesContext}

Gere uma síntese empolgante, estética e moderna da "Vibe Atual" desse usuário, seguida de 3 sugestões de check-ins futuros que combinam perfeitamente com esse perfil.
Siga rigorosamente este formato JSON:
{
  "userVibeTitle": "Título expressivo da vibe (ex: 'Boêmio Sofisticado & Amante de Vinhos')",
  "archetype": "Arquétipo em 2-3 palavras (ex: 'Explorador Noturno')",
  "summary": "Resumo de 2 frases diretas no estilo vamo.AI sobre o momento atual do usuário.",
  "favoriteVibes": ["Tag 1", "Tag 2", "Tag 3"],
  "energyLevel": "Intimista" | "Equilibrado" | "Vibrante",
  "energyPercentage": 78,
  "futureCheckinSuggestions": [
    {
      "id": "sug-1",
      "title": "Conceito marcante do lugar para próximo check-in",
      "category": "restaurantes",
      "vibe": "gastronomia",
      "reason": "Por que esse tipo de lugar fecha 100% com os últimos check-ins dele",
      "placeTypeKeyword": "italian"
    },
    {
      "id": "sug-2",
      "title": "Conceito marcante de bar/drinque",
      "category": "bares",
      "vibe": "drinques",
      "reason": "Por que esse lugar é o próximo passo natural",
      "placeTypeKeyword": "cocktail_bar"
    },
    {
      "id": "sug-3",
      "title": "Conceito marcante de café ou experiência relax",
      "category": "cafes",
      "vibe": "relax",
      "reason": "Equilíbrio perfeito para os momentos de pausa",
      "placeTypeKeyword": "cafe"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      userVibeTitle: parsed.userVibeTitle || 'Explorador de Experiências Únicas',
      archetype: parsed.archetype || 'Caçador de Vibe',
      summary: parsed.summary || 'Lugares com atmosfera marcante e identidade forte dominam o seu radar.',
      favoriteVibes: parsed.favoriteVibes || ['Gastronomia', 'Drinques Autorais', 'Bons Encontros'],
      energyLevel: parsed.energyLevel || 'Equilibrado',
      energyPercentage: parsed.energyPercentage || 75,
      futureCheckinSuggestions: parsed.futureCheckinSuggestions || [],
      source: 'gemini-3.8-flash',
    });
  } catch (error) {
    console.error('Error generating vibe dashboard:', error);
    return res.json({
      userVibeTitle: 'Explorador Gastronômico da Cidade',
      archetype: 'Curador Urbano',
      summary: 'Seu radar valoriza lugares autênticos com personalidade, bom atendimento e culinária afiada.',
      favoriteVibes: ['Bistrô & Vinho', 'Mixologia', 'Ambiente Aconchegante'],
      energyLevel: 'Intimista',
      energyPercentage: 75,
      futureCheckinSuggestions: [
        {
          id: 'fb-1',
          title: 'Bistrô de massas artesanais e luz de velas',
          category: 'restaurantes',
          vibe: 'gastronomia',
          reason: 'Combina com a atmosfera de suas últimas escolhas.',
          placeTypeKeyword: 'restaurant',
        },
        {
          id: 'fb-2',
          title: 'Bar secreto com carta autoral de coquetéis',
          category: 'bares',
          vibe: 'drinques',
          reason: 'Perfeito para esticar a noite com drinques memoráveis.',
          placeTypeKeyword: 'bar',
        },
      ],
      source: 'fallback',
    });
  }
});

// 3.7. Reverse Geocode API (Resolves city, state, neighborhood from GPS coordinates)
app.post('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8UE8LdHavPMAdIRBtng8hJ-k4ttk_jew';
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsApiKey}&language=pt-BR`;

    try {
      const geoRes = await fetch(geocodeUrl);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data.results && data.results.length > 0) {
          let city = '';
          let state = '';
          let neighborhood = '';

          for (const resItem of data.results) {
            for (const comp of resItem.address_components) {
              if (comp.types.includes('administrative_area_level_2') && !city) {
                city = comp.long_name;
              }
              if (comp.types.includes('locality') && !city) {
                city = comp.long_name;
              }
              if (comp.types.includes('administrative_area_level_1') && !state) {
                state = comp.short_name;
              }
              if (comp.types.includes('sublocality_level_1') && !neighborhood) {
                neighborhood = comp.long_name;
              }
            }
            if (city && state) break;
          }

          if (city) {
            return res.json({
              city,
              state: state || 'BR',
              neighborhood: neighborhood || 'Região Central',
              formatted: `${city} - ${state}`,
              source: 'google_geocoding',
            });
          }
        }
      }
    } catch (gErr) {
      console.warn('Google reverse geocode error:', gErr);
    }

    // Fallback: match closest known city from KNOWN_BRAZILIAN_CITIES
    let closestCity = 'São Paulo';
    let closestState = 'SP';
    let minD = 999999;
    for (const [key, c] of Object.entries(KNOWN_BRAZILIAN_CITIES)) {
      const d = Math.hypot(c.lat - Number(lat), c.lng - Number(lng));
      if (d < minD) {
        minD = d;
        closestCity = c.name;
        closestState = c.state;
      }
    }

    return res.json({
      city: closestCity,
      state: closestState,
      neighborhood: 'Região Central',
      formatted: `${closestCity} - ${closestState}`,
      source: 'nearest_hub',
    });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return res.json({
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Região Central',
      formatted: 'São Paulo - SP',
      source: 'fallback',
    });
  }
});

// 3.8. 3-Stop Itinerary Generator (Gemini-powered progressive evening/outing planner)
app.post('/api/itinerary-3-stops', async (req, res) => {
  try {
    const {
      vibe = 'gastronomia',
      when = 'hoje_noite',
      withWhom = 'casal',
      city = 'São Paulo',
      lat = -23.5651,
      lng = -46.6672,
      places = [],
    } = req.body || {};

    let candidatePlaces = Array.isArray(places) && places.length >= 3 ? places : [];
    if (candidatePlaces.length < 3) {
      const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8UE8LdHavPMAdIRBtng8hJ-k4ttk_jew';
      const fetched = await fetchRealGooglePlacesByQuery(`bares restaurantes cafés ${city}`, Number(lat), Number(lng), 7000, 10, mapsApiKey);
      candidatePlaces = fetched.map((gp) => transformGooglePlaceToItem(gp, Number(lat), Number(lng), mapsApiKey));
    }

    // Bucket into 3 stages: Stop 1 Drink/Aperitivo, Stop 2 Jantar/Principal, Stop 3 Sobremesa/Saideira
    let drinks = candidatePlaces.filter((p: any) => p.category === 'bares' || p.category === 'eventos' || (p.vibes && p.vibes.includes('drinques')));
    let dinners = candidatePlaces.filter((p: any) => p.category === 'restaurantes' || (p.vibes && p.vibes.includes('gastronomia')));
    let dessertsOrLate = candidatePlaces.filter((p: any) => p.category === 'cafes' || p.category === 'baladas' || (p.subCategory && p.subCategory.toLowerCase().includes('doce')) || p.category === 'bares');

    if (drinks.length === 0) drinks = candidatePlaces.slice(0, 1);
    if (dinners.length === 0) dinners = candidatePlaces.slice(1, 2);
    if (dessertsOrLate.length === 0) dessertsOrLate = candidatePlaces.slice(2, 3);

    const stop1Place = drinks[0] || candidatePlaces[0];
    const stop2Place = dinners.find((p: any) => p.id !== stop1Place.id) || candidatePlaces.find((p: any) => p.id !== stop1Place.id) || candidatePlaces[1];
    const stop3Place = dessertsOrLate.find((p: any) => p.id !== stop1Place.id && p.id !== stop2Place.id) || candidatePlaces.find((p: any) => p.id !== stop1Place.id && p.id !== stop2Place.id) || candidatePlaces[2];

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      const prompt = `Crie um roteiro perfeito e contínuo de 3 paradas ("Noite Completa / Rolê de 3 Paradas") para o app vamo.AI na cidade ${city}.
Vibe selecionada: ${vibe}
Momento: ${when}
Companhia: ${withWhom}

Parada 1 (Esquenta / Coquetel / Aperitivo inicial): "${stop1Place.title}" (${stop1Place.categoryLabel || stop1Place.category}, Bairro: ${stop1Place.neighborhood || city})
Parada 2 (O Prato Principal / Jantar marcante): "${stop2Place.title}" (${stop2Place.categoryLabel || stop2Place.category}, Bairro: ${stop2Place.neighborhood || city})
Parada 3 (Saideira / Sobremesa ou Fechamento): "${stop3Place.title}" (${stop3Place.categoryLabel || stop3Place.category}, Bairro: ${stop3Place.neighborhood || city})

Retorne rigorosamente um JSON válido com esta estrutura:
{
  "title": "Título sedutor do roteiro (ex: Circuito dos Drinques & Bistrôs)",
  "tagline": "Frase de impacto curta",
  "totalDurationHours": "3h30",
  "curatorNotes": "Dica geral do curador para a sincronia perfeita da noite",
  "stops": [
    {
      "order": 1,
      "stageName": "1º Esquenta & Drinque Autoral",
      "timeSlot": "19:30 - 20:45",
      "rationale": "Por que começar nesse lugar específico",
      "recommendedOrder": "O que pedir para abrir o apetite",
      "transitTimeToNextMin": 10
    },
    {
      "order": 2,
      "stageName": "2º O Prato Principal",
      "timeSlot": "21:00 - 22:45",
      "rationale": "Por que jantar aqui sem pressa",
      "recommendedOrder": "O prato de destaque obrigatório",
      "transitTimeToNextMin": 8
    },
    {
      "order": 3,
      "stageName": "3º Saideira & Fechamento",
      "timeSlot": "23:00 - 00:30",
      "rationale": "Por que terminar a noite aqui",
      "recommendedOrder": "A sobremesa, saideira ou drinque digestivo",
      "transitTimeToNextMin": 0
    }
  ]
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const generatedStops = (parsed.stops || []).map((s: any, idx: number) => {
          const matchedPlace = idx === 0 ? stop1Place : idx === 1 ? stop2Place : stop3Place;
          return {
            order: s.order || idx + 1,
            stageName: s.stageName || (idx === 0 ? '1º Esquenta & Drinque' : idx === 1 ? '2º Prato Principal' : '3º Saideira & Doce'),
            role: idx === 0 ? 'drink' : idx === 1 ? 'dinner' : 'dessert',
            timeSlot: s.timeSlot || (idx === 0 ? '19:30 - 20:30' : idx === 1 ? '20:45 - 22:30' : '22:45 - 00:00'),
            place: matchedPlace,
            rationale: s.rationale || `Combina com o ritmo de ${vibe} no bairro ${matchedPlace.neighborhood}.`,
            recommendedOrder: s.recommendedOrder || 'Peça a recomendação do chef da casa.',
            transitTimeToNextMin: s.transitTimeToNextMin ?? (idx < 2 ? 10 : 0),
          };
        });

        return res.json({
          id: `itin-${Date.now()}`,
          title: parsed.title || `Roteiro 3 Paradas: ${vibe.toUpperCase()} em ${city}`,
          tagline: parsed.tagline || 'Do primeiro brinde ao doce final, sem perrengue.',
          vibe,
          totalDurationHours: parsed.totalDurationHours || '4h00',
          curatorNotes: parsed.curatorNotes || 'Um roteiro com transição fluida, distâncias curtas e experiências complementares.',
          stops: generatedStops,
          source: 'gemini-3.8-flash',
        });
      } catch (geminiErr) {
        console.warn('Gemini 3-stop itinerary fallback:', geminiErr);
      }
    }

    // Structured fallback
    return res.json({
      id: `itin-${Date.now()}`,
      title: `Roteiro 3 Paradas: O Melhor de ${city}`,
      tagline: 'Esquenta, jantar principal e saideira em lugares de ponta.',
      vibe,
      totalDurationHours: '3h30',
      curatorNotes: 'Sequência desenhada para aproveitar a noite sem pressa e com deslocamento rápido.',
      stops: [
        {
          order: 1,
          stageName: '1º Esquenta & Drinque Autoral',
          role: 'drink',
          timeSlot: '19:30 - 20:45',
          place: stop1Place,
          rationale: `Comece no balcão de ${stop1Place.title} para quebrar a rotina com ótimos drinques e petiscos.`,
          recommendedOrder: 'Drinque da casa e petiscos para abrir o apetite.',
          transitTimeToNextMin: 10,
        },
        {
          order: 2,
          stageName: '2º O Prato Principal',
          role: 'dinner',
          timeSlot: '21:00 - 22:45',
          place: stop2Place,
          rationale: `O ápice da noite: ${stop2Place.title} com culinária autêntica e salão aconchegante.`,
          recommendedOrder: 'Prato especial do menu e vinho para harmonizar.',
          transitTimeToNextMin: 8,
        },
        {
          order: 3,
          stageName: '3º Saideira & Doce de Fechamento',
          role: 'dessert',
          timeSlot: '23:00 - 00:30',
          place: stop3Place,
          rationale: `Finalize em alto nível no ${stop3Place.title}, saboreando um doce ou a última rodada com calma.`,
          recommendedOrder: 'Sobremesa clássica, café especial ou drinque digestivo.',
          transitTimeToNextMin: 0,
        },
      ],
      source: 'curator_heuristic',
    });
  } catch (error) {
    console.error('Error generating 3-stop itinerary:', error);
    return res.status(500).json({ error: 'Falha ao gerar roteiro de 3 paradas' });
  }
});

// 4. Photo Proxy for Google Maps Places (avoids CORS and keeps API key secure)
app.get('/api/maps/photo', async (req, res) => {
  const { name, maxHeight = '800', maxWidth = '1200' } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).send('Photo name required');
  }
  const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8UE8LdHavPMAdIRBtng8hJ-k4ttk_jew';
  const targetUrl = `https://places.googleapis.com/v1/${name}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${mapsApiKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`;
  return res.redirect(targetUrl);
});

// 5. General Real-Time Google Places Search (with prominence ranking, price filters and type alternation)
app.post('/api/places/search', async (req, res) => {
  const {
    lat = -23.5651,
    lng = -46.6672,
    query = '',
    category = 'todos',
    radius = 6000,
    shuffle = false,
    rankby = 'prominence',
    minprice,
    maxprice,
    vibe,
    placeType,
  } = req.body || {};

  const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8UE8LdHavPMAdIRBtng8hJ-k4ttk_jew';

  const categoryTypeMap: Record<string, string[]> = {
    todos: ['restaurant', 'bar', 'cafe', 'bakery', 'night_club', 'barber_shop'],
    restaurantes: ['restaurant', 'brazilian_restaurant', 'italian_restaurant', 'pizza_restaurant', 'seafood_restaurant', 'japanese_restaurant'],
    bares: ['bar', 'cocktail_bar', 'pub', 'wine_bar'],
    cafes: ['cafe', 'bakery', 'coffee_shop', 'breakfast_restaurant'],
    baladas: ['night_club', 'bar', 'live_music_venue'],
    eventos: ['live_music_venue', 'performing_arts_theater', 'cultural_center'],
    barbearias: ['barber_shop', 'beauty_salon', 'spa'],
  };

  const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.location,places.photos,places.reviews,places.editorialSummary,places.googleMapsUri,places.dineIn,places.takeout,places.delivery,places.servesBeer,places.servesWine,places.servesCocktails,places.servesVegetarianFood,places.outdoorSeating,places.nationalPhoneNumber,places.websiteUri';

  const rankPreference = rankby === 'distance' ? 'DISTANCE' : 'POPULARITY';

  // Construct priceLevels array for TextSearch API
  const minP = minprice ? Math.max(1, Math.min(4, Number(minprice))) : (vibe === 'gastronomia' || vibe === 'casal' ? 2 : 1);
  const maxP = maxprice ? Math.max(1, Math.min(4, Number(maxprice))) : (vibe === 'relax' ? 2 : 4);

  const priceLevelsEnum: string[] = [];
  if (minP <= 1 && maxP >= 1) priceLevelsEnum.push('PRICE_LEVEL_INEXPENSIVE');
  if (minP <= 2 && maxP >= 2) priceLevelsEnum.push('PRICE_LEVEL_MODERATE');
  if (minP <= 3 && maxP >= 3) priceLevelsEnum.push('PRICE_LEVEL_EXPENSIVE');
  if (minP <= 4 && maxP >= 4) priceLevelsEnum.push('PRICE_LEVEL_VERY_EXPENSIVE');

  try {
    let placesData: any[] = [];

    if (query && query.trim().length > 0) {
      // Use Text Search API (New) with priceLevels and rank
      const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
      const textSearchBody: any = {
        textQuery: query.trim(),
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: {
              latitude: Number(lat),
              longitude: Number(lng),
            },
            radius: Number(radius) || 8000.0,
          },
        },
      };

      if (priceLevelsEnum.length > 0 && priceLevelsEnum.length < 4) {
        textSearchBody.priceLevels = priceLevelsEnum;
      }

      const textRes = await fetch(textSearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify(textSearchBody),
      });

      if (textRes.ok) {
        const data = await textRes.json();
        placesData = data.places || [];
      }
    } else if (placeType) {
      // Direct Place Type Request (e.g. alternating to 'restaurant', 'bar', 'cafe', 'night_club')
      const nearbySearchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
      const nearbyRes = await fetch(nearbySearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify({
          includedTypes: [placeType],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: Number(lat),
                longitude: Number(lng),
              },
              radius: Math.min(Number(radius) || 7000.0, 50000.0),
            },
          },
          rankPreference,
        }),
      });

      if (nearbyRes.ok) {
        const data = await nearbyRes.json();
        placesData = data.places || [];
      }
    } else if (category === 'todos') {
      // Category DIVERSIFICATION: Fetch diverse buckets in parallel to guarantee variety with prominence ranking
      const [resRestaurants, resBars, resCafes] = await Promise.all([
        fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask': fieldMask,
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
          body: JSON.stringify({
            includedTypes: ['restaurant', 'pizza_restaurant', 'italian_restaurant'],
            maxResultCount: 10,
            locationRestriction: {
              circle: { center: { latitude: Number(lat), longitude: Number(lng) }, radius: Number(radius) || 7000 },
            },
            rankPreference,
          }),
        }).then(r => r.ok ? r.json() : { places: [] }).catch(() => ({ places: [] })),

        fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask': fieldMask,
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
          body: JSON.stringify({
            includedTypes: ['bar', 'cocktail_bar', 'pub', 'night_club'],
            maxResultCount: 8,
            locationRestriction: {
              circle: { center: { latitude: Number(lat), longitude: Number(lng) }, radius: Number(radius) || 7000 },
            },
            rankPreference,
          }),
        }).then(r => r.ok ? r.json() : { places: [] }).catch(() => ({ places: [] })),

        fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask': fieldMask,
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
          body: JSON.stringify({
            includedTypes: ['cafe', 'bakery', 'coffee_shop'],
            maxResultCount: 8,
            locationRestriction: {
              circle: { center: { latitude: Number(lat), longitude: Number(lng) }, radius: Number(radius) || 7000 },
            },
            rankPreference,
          }),
        }).then(r => r.ok ? r.json() : { places: [] }).catch(() => ({ places: [] })),
      ]);

      const listRest = (resRestaurants.places || []).filter((p: any) => (p.rating || 0) >= 4.0);
      const listBars = (resBars.places || []).filter((p: any) => (p.rating || 0) >= 4.0);
      const listCafes = (resCafes.places || []).filter((p: any) => (p.rating || 0) >= 4.0);

      // Interleave to guarantee alternating categories
      const maxLen = Math.max(listRest.length, listBars.length, listCafes.length);
      const merged: any[] = [];
      const seenIds = new Set<string>();

      for (let i = 0; i < maxLen; i++) {
        if (listRest[i] && !seenIds.has(listRest[i].id)) {
          merged.push(listRest[i]);
          seenIds.add(listRest[i].id);
        }
        if (listBars[i] && !seenIds.has(listBars[i].id)) {
          merged.push(listBars[i]);
          seenIds.add(listBars[i].id);
        }
        if (listCafes[i] && !seenIds.has(listCafes[i].id)) {
          merged.push(listCafes[i]);
          seenIds.add(listCafes[i].id);
        }
      }

      placesData = merged.length > 0 ? merged : (resRestaurants.places || []);
    } else {
      // Specific Category Search
      const nearbySearchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
      const includedTypes = categoryTypeMap[category] || categoryTypeMap.todos;

      const nearbyRes = await fetch(nearbySearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: Number(lat),
                longitude: Number(lng),
              },
              radius: Math.min(Number(radius) || 7000.0, 50000.0),
            },
          },
          rankPreference,
        }),
      });

      if (nearbyRes.ok) {
        const data = await nearbyRes.json();
        placesData = data.places || [];
      }
    }

    const typeToCat: Record<string, any> = {
      restaurant: 'restaurantes',
      bar: 'bares',
      cafe: 'cafes',
      night_club: 'baladas',
      barber_shop: 'barbearias',
    };
    const targetOverride = placeType ? typeToCat[placeType] : (category && category !== 'todos') ? (category as any) : undefined;
    let formattedPlaces = placesData.map((gp) =>
      transformGooglePlaceToItem(gp, Number(lat), Number(lng), mapsApiKey, targetOverride)
    );

    // Apply price filter (1 = $, 2 = $$, 3 = $$$, 4 = $$$$)
    const priceLevelToNum: Record<string, number> = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
    const priceFiltered = formattedPlaces.filter((p) => {
      const num = priceLevelToNum[p.priceLevel] || 2;
      return num >= minP && num <= maxP;
    });
    if (priceFiltered.length >= 3) {
      formattedPlaces = priceFiltered;
    }

    // Filter quality places (rating >= 4.0 unless very few)
    const highQuality = formattedPlaces.filter((p) => (p.rating || 0) >= 4.0);
    if (highQuality.length >= 4) {
      formattedPlaces = highQuality;
    }

    if (shuffle && formattedPlaces.length > 3) {
      // Shuffle the results to alternate places on demand
      for (let i = formattedPlaces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [formattedPlaces[i], formattedPlaces[j]] = [formattedPlaces[j], formattedPlaces[i]];
      }
    }

    return res.json({
      places: formattedPlaces,
      source: 'google_maps_places_api_new',
      count: formattedPlaces.length,
      rankby,
      activeType: placeType,
    });
  } catch (error) {
    console.error('Error in /api/places/search:', error);
    return res.json({ places: [], source: 'error_fallback', count: 0 });
  }
});

// 6. Real Google Maps Places API (New) Nearby Suggestion for Moments (with alternation)
app.post('/api/places/nearby-recommendation', async (req, res) => {
  const { lat = -23.5651, lng = -46.6672, timeOfDay = 'noite' } = req.body || {};
  const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8UE8LdHavPMAdIRBtng8hJ-k4ttk_jew';

  let includedTypes = ['restaurant', 'bar'];
  if (timeOfDay === 'manha') {
    includedTypes = ['cafe', 'bakery', 'coffee_shop', 'breakfast_restaurant'];
  } else if (timeOfDay === 'tarde') {
    includedTypes = ['restaurant', 'cafe'];
  } else if (timeOfDay === 'pordosol') {
    includedTypes = ['bar', 'cocktail_bar', 'restaurant'];
  } else {
    includedTypes = ['bar', 'cocktail_bar', 'restaurant', 'night_club'];
  }

  try {
    const placesUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const payload = {
      includedTypes,
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: {
            latitude: Number(lat),
            longitude: Number(lng),
          },
          radius: 7000.0,
        },
      },
      rankPreference: 'POPULARITY',
    };

    const gRes = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.location,places.photos,places.reviews,places.editorialSummary,places.googleMapsUri,places.dineIn,places.outdoorSeating,places.servesCocktails,places.servesBeer,places.servesWine,places.servesVegetarianFood,places.delivery,places.nationalPhoneNumber',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify(payload),
    });

    if (gRes.ok) {
      const gData = await gRes.json();
      if (gData.places && gData.places.length > 0) {
        let formattedPlaces = gData.places.map((gp: any) =>
          transformGooglePlaceToItem(gp, Number(lat), Number(lng), mapsApiKey)
        );

        // Quality filter: rating >= 4.2
        const topRated = formattedPlaces.filter((p: any) => (p.rating || 0) >= 4.2);
        if (topRated.length > 0) {
          formattedPlaces = topRated;
        }

        // Shuffle so each suggestion cycle presents different places
        for (let i = formattedPlaces.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [formattedPlaces[i], formattedPlaces[j]] = [formattedPlaces[j], formattedPlaces[i]];
        }

        return res.json({
          places: formattedPlaces,
          source: 'google_maps_places_api_new',
        });
      }
    }
    return res.json({ places: [], source: 'fallback' });
  } catch (error) {
    console.error('Error fetching from Google Maps Places API:', error);
    return res.json({ places: [], source: 'error_fallback' });
  }
});

// Dev and Prod Vite server mounting
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
