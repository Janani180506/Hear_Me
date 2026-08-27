import React, { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, Type as TypeIcon, Gauge, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api-config";

const AvatarContainer = React.memo(() => {
  return (
    <div className="flex-grow w-full flex items-center justify-center relative min-h-[360px]">
      <div
        className="CWASAAvatar av0"
        style={{ transform: "scale(1.15)", transformOrigin: "center center" }}
      />
      <div className="hidden">
        <span className="CWASAAvMenu av0" />
        <input type="button" value="Sign" className="bttnPlaySiGMLURL av0" />
        <input type="button" value="Stop" className="bttnStop av0" />
        <span className="CWASASpeed av0" />
        <input className="txtSF av0" defaultValue="0/0" type="text" />
        <input className="txtGloss av0" defaultValue="[none]" type="text" />
        <input className="statusExtra av0" type="text" />
        <input type="text" id="URLText" className="txtSiGMLURL av0" defaultValue="" />
      </div>
    </div>
  );
}, () => true);

export const Route = createFileRoute("/text-to-sign")({
  component: TextToSign,
  head: () => ({
    meta: [
      { title: "Text to Sign — SignConnect" },
      { name: "description", content: "Type any sentence and watch an animated 3D avatar translate it into sign language." },
    ],
  }),
});

function TextToSign() {
  const [text, setText] = useState("Hello welcome to SignConnect");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number[]>([1]);
  const [activeWord, setActiveWord] = useState(0);

  const [translatedSequence, setTranslatedSequence] = useState<string[]>(["hello", "welcome", "to", "signconnect"]);
  const [loading, setLoading] = useState(false);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/cwasa.css";
    link.id = "cwasa-css";
    document.head.appendChild(link);

    // 2. Add config
    (window as any).initCfg = {
      avsbsl: ["luna", "siggi", "anna", "marc", "francoise"],
      avSettings: { avList: "avsbsl", initAv: "marc" }
    };
    (window as any).sigmlList = null;
    (window as any).tuavatarLoaded = false;
    (window as any).playerAvailableToPlay = true;

    // 3. Add JS
    const script = document.createElement("script");
    script.src = "/js/allcsa.js";
    script.type = "text/javascript";
    script.id = "cwasa-script";
    script.onload = () => {
      if ((window as any).CWASA) {
        try {
          (window as any).CWASA.init((window as any).initCfg);
        } catch (e) {
          console.error("CWASA init error:", e);
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      const existingLink = document.getElementById("cwasa-css");
      if (existingLink) existingLink.remove();
      const existingScript = document.getElementById("cwasa-script");
      if (existingScript) existingScript.remove();
    };
  }, []);

  // Set speed factor when speed slider changes
  useEffect(() => {
    const spdVal = speed[0] || 1;
    if ((window as any).CWASA && typeof (window as any).CWASA.setSpeedFactor === "function") {
      try {
        (window as any).CWASA.setSpeedFactor(spdVal);
      } catch (e) {
        console.error("Speed adjustment error:", e);
      }
    }
  }, [speed]);

  // Translate text to ISL word sequence
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setTranslatedSequence([]);
      setLoading(false);
      return;
    }

    // Immediately fallback to split words so mapped sequence is never empty when text is present
    const fallbackWords = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    setTranslatedSequence(fallbackWords);

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok && Array.isArray(data.sequence) && data.sequence.length > 0) {
            setTranslatedSequence(data.sequence.map((w: string) => w.toLowerCase()));
          }
        }
      } catch (err) {
        console.warn("Translation service warning (using word fallback):", err);
      } finally {
        setLoading(false);
        setActiveWord(0);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [text]);

  const startPlayback = () => {
    if (translatedSequence.length === 0) {
      toast.error("Enter a sentence to sign first.");
      return;
    }
    setPlaying(true);

    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    (window as any).playerAvailableToPlay = true;
    let i = activeWord >= translatedSequence.length ? 0 : activeWord;

    let lastWordStartTime = Date.now();

    playIntervalRef.current = setInterval(() => {
      let isAvailable = (window as any).playerAvailableToPlay;
      const timeSinceStart = Date.now() - lastWordStartTime;

      if (!isAvailable && timeSinceStart > 5000) {
        (window as any).playerAvailableToPlay = true;
        isAvailable = true;
      }

      if (i >= translatedSequence.length) {
        if (isAvailable) {
          clearInterval(playIntervalRef.current!);
          setPlaying(false);
          setActiveWord(0);
          toast.success("Completed sign sequence.");
        }
      } else if (isAvailable) {
        (window as any).playerAvailableToPlay = false;
        lastWordStartTime = Date.now();
        const word = translatedSequence[i];

        if ((window as any).CWASA) {
          const sigmlPath = window.location.origin + "/SignFiles/" + word + ".sigml";
          try {
            const urlTextInput = document.getElementById("URLText");
            if (urlTextInput) {
              (urlTextInput as HTMLInputElement).value = sigmlPath;
            }
            (window as any).CWASA.playSiGMLURL(sigmlPath);
          } catch (e) {
            // Fallback to letter spelling
            const firstChar = word.charAt(0).toUpperCase();
            const letterSigml = window.location.origin + "/SignFiles/" + firstChar + ".sigml";
            try {
              (window as any).CWASA.playSiGMLURL(letterSigml);
            } catch {
              (window as any).playerAvailableToPlay = true;
            }
          }
        }

        setActiveWord(i);
        i++;
      }
    }, 300);
  };

  const stopPlayback = () => {
    setPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    const stopBtn = document.querySelector<HTMLButtonElement>(".bttnStop.av0");
    if (stopBtn) stopBtn.click();
    (window as any).playerAvailableToPlay = true;
  };

  const replay = () => {
    stopPlayback();
    setActiveWord(0);
    setTimeout(() => {
      startPlayback();
    }, 200);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TypeIcon className="h-6 w-6" />}
        eyebrow="Avatar Animation"
        title="Text to Sign Engine"
        description="Type any sentence and watch the 3D avatar translate and perform Indian Sign Language animations."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-5 shadow-card">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary">
              Your sentence
            </label>
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                stopPlayback();
              }}
              rows={5}
              placeholder="Type anything you want to sign..."
              className="mt-2 resize-none text-base"
            />
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Translating to ISL syntax...
              </div>
            )}
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mapped Sign Sequence
              </span>
              <Badge variant="outline" className="text-xs">
                {translatedSequence.length} Sign Units
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {translatedSequence.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">No signs mapped yet</span>
              ) : (
                translatedSequence.map((w, idx) => (
                  <Badge
                    key={idx}
                    variant={playing && activeWord === idx ? "default" : "secondary"}
                    className={`px-3 py-1.5 text-sm uppercase transition-all ${
                      playing && activeWord === idx ? "scale-105 shadow-glow font-bold" : ""
                    }`}
                  >
                    {w}
                  </Badge>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                {!playing ? (
                  <Button onClick={startPlayback} className="gap-2 font-semibold shadow-glow gradient-primary">
                    <Play className="h-4 w-4" /> Play Signs
                  </Button>
                ) : (
                  <Button onClick={stopPlayback} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                )}
                <Button onClick={replay} variant="outline" size="icon" title="Replay Sequence">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3 min-w-[160px]">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={speed}
                  onValueChange={(val) => setSpeed(val)}
                  min={0.5}
                  max={2.0}
                  step={0.25}
                  className="flex-1"
                />
                <span className="text-xs font-bold w-8">{speed[0]}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Avatar Display Container */}
        <div className="flex flex-col rounded-3xl border bg-card p-4 shadow-card overflow-hidden">
          <AvatarContainer />
        </div>
      </div>
    </div>
  );
}
