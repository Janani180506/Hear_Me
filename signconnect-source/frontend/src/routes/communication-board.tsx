import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Volume2,
  RotateCcw,
  Sparkles,
  Utensils,
  Droplet,
  Pill,
  Bath,
  Activity,
  Moon,
  Smile,
  Frown,
  ShieldAlert,
  Heart,
  Siren,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Hand,
  MessageSquare,
  Globe,
  Plus,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/communication-board")({
  component: CommunicationBoardPage,
});

export const CATEGORY_LIST = ["Needs", "Emotions", "Emergency", "Feelings"] as const;

export function normalizeCategory(cat: string | null | undefined): string {
  if (!cat || !String(cat).trim()) return "Uncategorized";
  const s = String(cat).trim().toLowerCase();
  if (s === "needs" || s === "cat_needs" || s === "need") return "Needs";
  if (s === "emotions" || s === "cat_emotions" || s === "emotion") return "Emotions";
  if (s === "emergency" || s === "cat_emergency") return "Emergency";
  if (s === "feelings" || s === "cat_feelings" || s === "feeling" || s === "cat_phrases" || s === "phrases" || s === "quick phrases") return "Feelings";
  console.warn(`[Category Warning] Unrecognized category '${cat}', returning title case.`);
  return String(cat).trim();
}

interface CommunicationCard {
  id: string;
  category?: string;
  category_id?: string;
  title: string;
  phrase: string;
  spoken_phrase?: string;
  icon: string;
  translations?: {
    en: string;
    ta: string;
    hi: string;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const ICON_MAP: Record<string, any> = {
  Utensils,
  Droplet,
  Pill,
  Bath,
  Activity,
  Moon,
  Smile,
  Frown,
  ShieldAlert,
  Heart,
  Siren,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Hand,
  MessageSquare,
};

function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] || MessageSquare;
}

function CommunicationBoardPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "ta" | "hi">("en");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sentence, setSentence] = useState<string[]>([]);
  const [cards, setCards] = useState<CommunicationCard[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    fetchBoardData();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const fetchBoardData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/communication/board/user_default");
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
        setPredictions(data.predictions || []);
      } else {
        fetchFallbackData();
      }
    } catch {
      fetchFallbackData();
    }
  };

  const fetchFallbackData = () => {
    setCards([
      {
        id: "card_hungry",
        category: "Needs",
        category_id: "Needs",
        title: "Food",
        phrase: "I want food.",
        icon: "Utensils",
        translations: {
          en: "I want food.",
          ta: "எனக்கு சாப்பாடு வேண்டும்.",
          hi: "मुझे खाना चाहिए।",
        },
      },
      {
        id: "card_water",
        category: "Needs",
        category_id: "Needs",
        title: "Water",
        phrase: "I want water.",
        icon: "Droplet",
        translations: {
          en: "I want water.",
          ta: "எனக்கு தண்ணீர் வேண்டும்.",
          hi: "मुझे पानी चाहिए।",
        },
      },
      {
        id: "card_medicine",
        category: "Needs",
        category_id: "Needs",
        title: "Medicine",
        phrase: "I need my medicine.",
        icon: "Pill",
        translations: {
          en: "I need my medicine.",
          ta: "எனக்கு மருந்து வேண்டும்.",
          hi: "मुझे दवा चाहिए।",
        },
      },
      {
        id: "card_restroom",
        category: "Needs",
        category_id: "Needs",
        title: "Restroom",
        phrase: "I want to go to the restroom.",
        icon: "Bath",
        translations: {
          en: "I want to go to the restroom.",
          ta: "எனக்கு கழிப்பறைக்கு செல்ல வேண்டும்.",
          hi: "मुझे शौचालय जाना है।",
        },
      },
      {
        id: "card_sleep",
        category: "Needs",
        category_id: "Needs",
        title: "Sleep",
        phrase: "I want to sleep.",
        icon: "Moon",
        translations: {
          en: "I want to sleep.",
          ta: "நான் தூங்க வேண்டும்.",
          hi: "मैं सोना चाहता हूँ।",
        },
      },
      {
        id: "card_caregiver",
        category: "Needs",
        category_id: "Needs",
        title: "Caregiver",
        phrase: "I need my caregiver.",
        icon: "Hand",
        translations: {
          en: "I need my caregiver.",
          ta: "எனக்கு என் பராமரிப்பாளர் வேண்டும்.",
          hi: "मुझे अपने देखभालकर्ता की आवश्यकता है।",
        },
      },
      {
        id: "card_happy",
        category: "Emotions",
        category_id: "Emotions",
        title: "Happy",
        phrase: "I am feeling happy.",
        icon: "Smile",
        translations: {
          en: "I am feeling happy.",
          ta: "நான் மகிழ்ச்சியாக உணர்கிறேன்.",
          hi: "நான் खुश महसूस कर रहा हूँ।",
        },
      },
      {
        id: "card_sad",
        category: "Emotions",
        category_id: "Emotions",
        title: "Sad",
        phrase: "I am feeling sad.",
        icon: "Frown",
        translations: {
          en: "I am feeling sad.",
          ta: "நான் வருத்தமாக இருக்கிறேன்.",
          hi: "मैं उदास महसूस कर रहा हूँ।",
        },
      },
      {
        id: "card_thankful",
        category: "Emotions",
        category_id: "Emotions",
        title: "Thank You",
        phrase: "Thank you very much.",
        icon: "Heart",
        translations: {
          en: "Thank you very much.",
          ta: "மிக்க நன்றி.",
          hi: "आपका बहुत-बहुत धन्यवाद।",
        },
      },
      {
        id: "card_emergency_help",
        category: "Emergency",
        category_id: "Emergency",
        title: "Emergency Help",
        phrase: "I need help",
        icon: "Siren",
        translations: {
          en: "I need help",
          ta: "எனக்கு உதவி வேண்டும்",
          hi: "मुझे मदद चाहिए",
        },
      },
      {
        id: "card_call_doctor",
        category: "Emergency",
        category_id: "Emergency",
        title: "Call Doctor",
        phrase: "Please call a doctor.",
        icon: "PhoneCall",
        translations: {
          en: "Please call a doctor.",
          ta: "தயவுசெய்து மருத்துவரை அழைக்கவும்.",
          hi: "कृपया डॉक्टर को बुलाएं।",
        },
      },
      {
        id: "card_pain",
        category: "Feelings",
        category_id: "Feelings",
        title: "Pain",
        phrase: "I am in pain.",
        icon: "Activity",
        translations: {
          en: "I am in pain.",
          ta: "எனக்கு வலிக்கிறது.",
          hi: "मुझे दर्द हो रहा है।",
        },
      },
      {
        id: "card_scared",
        category: "Feelings",
        category_id: "Feelings",
        title: "Scared",
        phrase: "I am feeling scared.",
        icon: "ShieldAlert",
        translations: {
          en: "I am feeling scared.",
          ta: "எனக்கு பயமாக இருக்கிறது.",
          hi: "मुझे डर लग रहा है।",
        },
      },
    ]);
  };

  const getPhraseForCard = (card: CommunicationCard, lang: "en" | "ta" | "hi" = selectedLanguage): string => {
    if (!card) return "";

    if (card.id === "card_emergency_help" || card.title === "Emergency Help" || (card as any).is_emergency) {
      if (lang === "ta") return "எனக்கு உதவி வேண்டும்";
      if (lang === "hi") return "मुझे मदद चाहिए";
      return "I need help";
    }

    const t = card.translations || (card as any).phrases || {};
    if (t) {
      if (lang === "ta" && t.ta && String(t.ta).trim()) return String(t.ta).trim();
      if (lang === "hi" && t.hi && String(t.hi).trim()) return String(t.hi).trim();
      if (lang === "en" && t.en && String(t.en).trim()) return String(t.en).trim();
    }

    if (lang === "ta") {
      const taVal = (card as any).phrase_ta || (card as any).phraseTa || (card as any).tamil_phrase || (card as any).tamilPhrase;
      if (taVal && String(taVal).trim()) return String(taVal).trim();
    }

    if (lang === "hi") {
      const hiVal = (card as any).phrase_hi || (card as any).phraseHi || (card as any).hindi_phrase || (card as any).hindiPhrase;
      if (hiVal && String(hiVal).trim()) return String(hiVal).trim();
    }

    if (lang === "en") {
      const enVal = (card as any).phrase_en || (card as any).phraseEn || card.phrase || card.spoken_phrase;
      if (enVal && String(enVal).trim()) return String(enVal).trim();
    }

    return card.phrase || card.spoken_phrase || "";
  };

  const speakPhrase = (textToSpeak: string, lang: "en" | "ta" | "hi") => {
    if (!textToSpeak || !textToSpeak.trim()) return;

    const langMap: Record<"en" | "ta" | "hi", string> = {
      en: "en-US",
      ta: "ta-IN",
      hi: "hi-IN",
    };

    const speechLang = langMap[lang] || "en-US";

    console.log("CARD CLICK");
    console.log("Selected language:", lang);
    console.log("Phrase to speak:", textToSpeak);
    console.log("Speech language:", speechLang);

    // 1. Immediate Web Speech API call (Synchronous inside click event flow)
    let webSpeechSpoken = false;
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = speechLang;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const targetPrefix = lang === "ta" ? "ta" : lang === "hi" ? "hi" : "en";
          const matchingVoice = voices.find((v) => {
            const voiceLang = (v.lang || "").toLowerCase().replace("_", "-");
            return voiceLang.startsWith(targetPrefix) || voiceLang.includes(`-${targetPrefix}`);
          });

          if (matchingVoice) {
            utterance.voice = matchingVoice;
            webSpeechSpoken = true;
          }
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("[Web Speech Error]", err);
      }
    }

    // 2. Immediate backend gTTS Audio Fallback for Tamil/Hindi to guarantee 100% clear audio on systems without local voice packs
    if (lang === "ta" || lang === "hi" || !webSpeechSpoken) {
      fetch("http://localhost:8000/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, language: lang }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.audio_base64) {
            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
            const audio = new Audio(`data:${data.mime_type || "audio/mp3"};base64,${data.audio_base64}`);
            audio.play().catch((e) => console.warn("[Audio Play Error]", e));
          }
        })
        .catch((err) => console.warn("[Backend TTS Fetch Error]", err));
    }
  };

  const handleEmergencyClick = async (card: CommunicationCard) => {
    const spokenText = getPhraseForCard(card, selectedLanguage) || "I need help";

    // 1. Speak "I need help" locally on user's device via TTS immediately
    speakPhrase(spokenText, selectedLanguage);

    toast.info("Sending emergency alert to caregiver...");

    // 2. Obtain browser location using Geolocation API
    let lat: number | null = null;
    let lng: number | null = null;

    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 0,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("[Emergency Card] Geolocation unavailable or permission denied:", err);
      }
    }

    // 3. Send POST request to backend WhatsApp emergency endpoint
    try {
      const res = await fetch("http://localhost:8000/api/emergency/touchspeak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "Alex Rivera",
          user_name: "Alex Rivera",
          message: "I need help",
          latitude: lat,
          longitude: lng,
        }),
      });

      const data = await res.json();

      if (data.status === "failed" && data.message?.includes("No caregiver is registered")) {
        toast.error("No caregiver is registered. Please add a caregiver first.");
        return;
      }

      if (res.ok && data.status === "success") {
        toast.success("✓ Emergency alert sent to caregiver");
      } else {
        const caregivers = data.caregivers || [];
        if (caregivers.length > 0) {
          const primary = caregivers.find((c: any) => c.is_primary) || caregivers[0];
          const cleanPhone = (primary.phone || "").replace(/[^0-9+]/g, "").replace(/^\+/, "");
          if (cleanPhone) {
            const locText = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : "Location unavailable";
            const currentStr = new Date().toLocaleString();
            const msg = `🚨 EMERGENCY ALERT\n\nUser: Alex Rivera\n\nThe user needs immediate help.\n\nRequest:\n"${spokenText}"\n\nLocation:\n${locText}\n\nTime:\n${currentStr}\n\nPlease check on the user immediately.`;
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, "_blank");
            toast.success("✓ Emergency alert dispatched to caregiver via WhatsApp");
            return;
          }
        }
        toast.error(data.message || "Unable to send emergency alert. Please check caregiver WhatsApp configuration.");
      }
    } catch (e) {
      console.error("[Emergency Card] Network error sending alert:", e);
      toast.error("Unable to send emergency alert. Please check network or caregiver configuration.");
    }

    // 4. Record click for AI phrase predictor
    fetch("http://localhost:8000/api/communication/card-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "user_default",
        card_id: card.id,
        phrase: spokenText,
      }),
    }).catch(() => {});
  };

  const handleCardClick = (card: CommunicationCard) => {
    const isEmergency =
      card.id === "card_emergency_help" ||
      card.title === "Emergency Help" ||
      (card as any).is_emergency;

    if (isEmergency) {
      handleEmergencyClick(card);
      return;
    }

    const phraseToSpeak = getPhraseForCard(card, selectedLanguage);

    if (!phraseToSpeak) {
      const langName = selectedLanguage === "ta" ? "Tamil" : selectedLanguage === "hi" ? "Hindi" : "English";
      toast.warning(`${langName} phrase not available for "${card.title}"`, {
        description: `Add a ${langName} translation in the Caregiver Dashboard.`,
      });
      return;
    }

    // 1. Add exact phrase to sentence builder
    setSentence((prev) => [...prev, phraseToSpeak]);
    toast.success(`Added "${card.title}" (${selectedLanguage.toUpperCase()}) to sentence builder`);

    // 2. Speak exact phrase immediately using TTS
    speakPhrase(phraseToSpeak, selectedLanguage);

    // Record click for AI phrase predictor
    fetch("http://localhost:8000/api/communication/card-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "user_default",
        card_id: card.id,
        phrase: card.phrase || card.spoken_phrase || "",
      }),
    }).catch(() => {});
  };

  const handleSpeakSentence = async () => {
    const fullText = sentence.join(" ");
    if (!fullText.trim()) {
      toast.error("Sentence is empty! Tap cards below to build your sentence.");
      return;
    }

    setIsSpeaking(true);
    try {
      const res = await fetch("http://localhost:8000/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, language: selectedLanguage }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          const audio = new Audio(`data:${data.mime_type || "audio/mp3"};base64,${data.audio_base64}`);
          audio.play();
          audio.onended = () => setIsSpeaking(false);
          toast.success("Speaking sentence...");
          return;
        }
      }
    } catch {
      // Fallback to browser SpeechSynthesis API
    }

    if ("speechSynthesis" in window) {
      speakPhrase(fullText, selectedLanguage);
      setIsSpeaking(false);
      toast.success("Speaking sentence...");
    } else {
      setIsSpeaking(false);
      toast.error("Text-to-speech unavailable.");
    }
  };

  const filteredCards = cards.filter((card) => {
    if (activeCategory === "all") return true;
    const cardCat = normalizeCategory(card.category || card.category_id);
    return cardCat === activeCategory;
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 p-4 md:p-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AAC Communication Board</h1>
          <p className="text-muted-foreground text-sm">
            Tap cards to build sentences, trigger AI phrase predictions, and speak in English, Tamil, or Hindi.
          </p>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-2 rounded-xl bg-card border p-1.5 shadow-sm">
          <Globe className="h-4 w-4 text-muted-foreground ml-2" />
          <span className="text-xs font-semibold text-muted-foreground">Language:</span>
          {(["en", "ta", "hi"] as const).map((lang) => (
            <Button
              key={lang}
              variant={selectedLanguage === lang ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs font-semibold uppercase rounded-lg"
              onClick={() => setSelectedLanguage(lang)}
            >
              {lang === "en" ? "English" : lang === "ta" ? "தமிழ்" : "हिंदी"}
            </Button>
          ))}
        </div>
      </div>

      {/* Sentence Builder Bar */}
      <Card className="border-primary/20 bg-card/60 shadow-md backdrop-blur">
        <CardContent className="p-4 md:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Sentence Builder
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSentence([])}
                disabled={sentence.length === 0}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>

          <div className="min-h-[4rem] rounded-xl border bg-background/80 p-4 flex flex-wrap items-center gap-2 shadow-inner">
            {sentence.length === 0 ? (
              <span className="text-sm text-muted-foreground italic">
                Tap cards or speak gestures to construct your message...
              </span>
            ) : (
              sentence.map((item, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-medium gap-2 border shadow-sm animate-in fade-in zoom-in-95"
                >
                  {item}
                  <button
                    onClick={() => setSentence(sentence.filter((_, i) => i !== idx))}
                    className="hover:text-destructive text-muted-foreground ml-1"
                  >
                    ×
                  </button>
                </Badge>
              ))
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              size="lg"
              className="gap-2 font-semibold shadow-glow gradient-primary"
              onClick={handleSpeakSentence}
              disabled={isSpeaking || sentence.length === 0}
            >
              <Volume2 className={`h-5 w-5 ${isSpeaking ? "animate-bounce" : ""}`} />
              {isSpeaking ? "Speaking..." : "Speak Sentence"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Phrase Prediction Banner */}
      {predictions.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                AI Next-Phrase Predictions
              </div>
              <div className="text-xs text-muted-foreground">
                Smart suggestions based on your frequent communication habits
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {predictions.map((pred, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/30 hover:border-primary text-xs font-medium bg-background"
                onClick={() => {
                  setSentence((prev) => [...prev, pred.phrase]);
                  toast.success(`Added AI prediction: "${pred.title}"`);
                }}
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                {pred.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-full px-4 text-xs font-semibold"
          onClick={() => setActiveCategory("all")}
        >
          All Cards
        </Button>
        {CATEGORY_LIST.map((catName) => (
          <Button
            key={catName}
            variant={activeCategory === catName ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4 text-xs font-semibold gap-2"
            onClick={() => setActiveCategory(catName)}
          >
            {catName}
          </Button>
        ))}
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="col-span-full py-12 text-center text-muted-foreground bg-card/40 rounded-2xl border border-dashed p-8">
          <p className="text-base font-medium text-foreground">No communication cards in this category yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Caregivers can add custom cards for {activeCategory} in the Caregiver Dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCards.map((card) => {
            const IconComp = getIconComponent(card.icon);
            const phraseText = getPhraseForCard(card);
            const isEmergency =
              card.id === "card_emergency_help" ||
              card.title === "Emergency Help" ||
              (card as any).is_emergency;

            if (isEmergency) {
              return (
                <Card
                  key={card.id}
                  className="group relative cursor-pointer border-2 border-destructive/70 bg-destructive/5 hover:bg-destructive/10 transition-all hover:shadow-xl hover:-translate-y-1 active:translate-y-0 shadow-md"
                  onClick={() => handleCardClick(card)}
                >
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive text-destructive-foreground shadow-glow animate-pulse">
                      <Siren className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-sm leading-tight text-destructive flex items-center justify-center gap-1">
                        <span>🚨</span> {card.title}
                      </h3>
                      <p className="text-xs font-semibold text-foreground/90 line-clamp-2 leading-relaxed">
                        "{phraseText || "I need help"}"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card
                key={card.id}
                className="group relative cursor-pointer border hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                onClick={() => handleCardClick(card)}
              >
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                    <IconComp className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm leading-tight">{card.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {phraseText ? (
                        phraseText
                      ) : (
                        <span className="italic text-muted-foreground/60 font-normal text-[11px]">
                          {selectedLanguage === "ta" ? "Tamil phrase not available" : "Hindi phrase not available"}
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
