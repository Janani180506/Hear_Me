import React, { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, Type as TypeIcon, Gauge, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

const AvatarContainer = React.memo(() => {
  return (
    <div className="flex-grow w-full flex items-center justify-center relative min-h-[360px]">
      <div
        className="CWASAAvatar av0"
        style={{ transform: "scale(1.15)", transformOrigin: "center center" }}
      />
      {/* Hidden CWASA UI hooks to bypass null ref checks inside allcsa.js */}
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
  const [text, setText] = useState("Hello, welcome to SignConnect!");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState([1]);
  const [activeWord, setActiveWord] = useState(0);

  const [translatedSequence, setTranslatedSequence] = useState<string[]>(["hello", "welcome", "to", "signconnect"]);
  const [loading, setLoading] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load CWASA assets globally
  useEffect(() => {
    // 1. Add CSS
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
      console.log("CWASA player script loaded.");
      if ((window as any).CWASA) {
        try {
          (window as any).CWASA.init((window as any).initCfg);
        } catch (e) {
          console.error("Error calling CWASA init:", e);
        }
      }
    };
    document.body.appendChild(script);

    // Setup checker for avatarLoaded state
    const checkInterval = setInterval(() => {
      if ((window as any).tuavatarLoaded) {
        setAvatarLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      const existingLink = document.getElementById("cwasa-css");
      if (existingLink) existingLink.remove();
      const existingScript = document.getElementById("cwasa-script");
      if (existingScript) existingScript.remove();
    };
  }, []);

  // Debounced translation fetch from FastAPI backend (port 8000)
  useEffect(() => {
    if (!text.trim()) {
      setTranslatedSequence([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        // POST to FastAPI backend running on port 8000
        const response = await fetch("http://localhost:8000/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok && Array.isArray(data.sequence)) {
            const words = data.sequence.map((w: string) => w.toLowerCase());
            setTranslatedSequence(words);
            setActiveWord(0);
            stopPlayback();
          }
        }
      } catch (err) {
        console.error("ISL translation failed:", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [text]);

  const startPlayback = () => {
    if (translatedSequence.length === 0) return;
    setPlaying(true);

    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    (window as any).playerAvailableToPlay = true;
    let i = activeWord >= translatedSequence.length ? 0 : activeWord;

    let lastWordStartTime = Date.now();

    playIntervalRef.current = setInterval(() => {
      let isAvailable = (window as any).playerAvailableToPlay;

      const timeSinceStart = Date.now() - lastWordStartTime;
      if (!isAvailable && timeSinceStart > 6000) {
        console.warn("Playback safety timeout reached. Skipping word...");
        (window as any).playerAvailableToPlay = true;
        isAvailable = true;
      }

      if (i >= translatedSequence.length) {
        if (isAvailable) {
          clearInterval(playIntervalRef.current!);
          setPlaying(false);
          setActiveWord(0);
        }
      } else if (isAvailable) {
        (window as any).playerAvailableToPlay = false;
        lastWordStartTime = Date.now();
        const word = translatedSequence[i];

        if ((window as any).CWASA) {
          // Pass the absolute URL of the sigml file to the player
          const fullSigmlURL = window.location.origin + "/SignFiles/" + word + ".sigml";
          try {
            // Update hidden url input to prevent library index errors
            const urlTextInput = document.getElementById("URLText");
            if (urlTextInput) {
              (urlTextInput as HTMLInputElement).value = fullSigmlURL;
            }
            (window as any).CWASA.playSiGMLURL(fullSigmlURL);
          } catch (e) {
            console.error("CWASA play error:", e);
            (window as any).playerAvailableToPlay = true;
          }
        }

        setActiveWord(i);
        i++;
      }
    }, 200);
  };

  const stopPlayback = () => {
    setPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    const stopBtn = document.querySelector<HTMLButtonElement>(".bttnStop.av0");
    if (stopBtn) {
      stopBtn.click();
    }
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
        eyebrow="Avatar"
        title="Text to Sign"
        description="Type any sentence and watch an animated 3D avatar translate it into sign language."
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
              <div className="mt-4">
                <span className="text-xs text-muted-foreground animate-pulse">Translating to ISL grammar...</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <Gauge className="h-4 w-4 text-primary" /> Speed Control
              </span>
              <span className="font-mono text-sm text-muted-foreground">{speed[0].toFixed(2)}x</span>
            </div>

            <Slider
              value={speed}
              onValueChange={(val) => {
                setSpeed(val);
                const resetBtn = document.querySelector<HTMLButtonElement>(".bttnSpeedReset.av0");
                const downBtn = document.querySelector<HTMLButtonElement>(".bttnSpeedDown.av0");
                const upBtn = document.querySelector<HTMLButtonElement>(".bttnSpeedUp.av0");
                if (resetBtn && downBtn && upBtn) {
                  resetBtn.click();
                  const targetSpeed = val[0];
                  if (targetSpeed <= 0.5) {
                    downBtn.click();
                    downBtn.click();
                  } else if (targetSpeed <= 0.75) {
                    downBtn.click();
                  } else if (targetSpeed >= 2.0) {
                    upBtn.click();
                    upBtn.click();
                  } else if (targetSpeed >= 1.5) {
                    upBtn.click();
                  }
                }
              }}
              min={0.25}
              max={2}
              step={0.25}
              className="mt-3"
            />

            <div className="mt-5 flex flex-wrap gap-2">
              {playing ? (
                <Button onClick={stopPlayback} variant="outline" className="rounded-xl">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button onClick={startPlayback} disabled={!avatarLoaded || translatedSequence.length === 0} className="gradient-primary text-primary-foreground rounded-xl">
                  <Play className="mr-2 h-4 w-4" /> Play
                </Button>
              )}
              <Button onClick={replay} disabled={!avatarLoaded || translatedSequence.length === 0} variant="outline" className="rounded-xl">
                <RotateCcw className="mr-2 h-4 w-4" /> Replay
              </Button>
            </div>
          </div>
        </div>

        {/* 3D WebGL Avatar View Container */}
        <div className="relative aspect-square overflow-hidden rounded-3xl border shadow-elevated sm:aspect-[4/3] lg:aspect-auto lg:min-h-[500px] flex flex-col items-center justify-between p-4"
          style={{ background: "var(--gradient-soft)" }}
        >
          {/* Avatar Loading Overlay */}
          {!avatarLoaded && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-semibold text-muted-foreground animate-pulse">
                Initializing 3D Avatar Player...
              </p>
            </div>
          )}

          {/* Static Avatar Container that never triggers React Virtual DOM updates */}
          <AvatarContainer />

          {/* Active Word Gloss Overlay */}
          <div className="w-full rounded-2xl glass-strong p-3 text-center z-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Now signing</div>
            <div className="mt-0.5 text-lg font-semibold text-gradient">
              {translatedSequence[activeWord] ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
