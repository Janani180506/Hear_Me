import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Send, Save, Trash2, MessagesSquare, Hand, Type as TypeIcon, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/live")({
  component: Live,
  head: () => ({
    meta: [
      { title: "Live Communication — SignConnect" },
      { name: "description", content: "Split-screen live conversations between sign language and text with saved history." },
    ],
  }),
});

interface Msg {
  id: string;
  side: "sign" | "text";
  content: string;
  time: string;
}

function Live() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [active, setActive] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState("none");
  const [signedSentence, setSignedSentence] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [messages, setMessages] = useState<Msg[]>([
    { id: "1", side: "sign", content: "HELLO", time: "09:42" },
    { id: "2", side: "text", content: "Hi, how can I help you today?", time: "09:42" },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggle = async () => {
    if (active) {
      stopCamera();
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setActive(true);

        const ws = new WebSocket("ws://localhost:5005");
        wsRef.current = ws;

        ws.onopen = () => {
          toast.success("Connected to Gesture Server in Live Mode");
          startSendingFrames();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.status === "success") {
              setCurrentSymbol(data.current_symbol || "none");
              setSignedSentence(data.sentence || "");
              setSuggestions(data.suggestions || []);
            } else if (data.status === "cleared") {
              setSignedSentence("");
              setSuggestions([]);
            }
          } catch (e) {
            console.error("WS error:", e);
          }
        };

        ws.onerror = () => {
          toast.error("Gesture Server Connection Error. Ensure python gesture_server.py is running!");
        };

      } catch {
        toast.error("Camera access denied");
      }
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
    setCurrentSymbol("none");
    setSuggestions([]);
    toast.info("Camera and gesture detection stopped");
  };

  const startSendingFrames = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    intervalRef.current = window.setInterval(() => {
      if (
        videoRef.current &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64Jpeg = canvas.toDataURL("image/jpeg", 0.7);
          wsRef.current.send(JSON.stringify({ frame: base64Jpeg }));
        }
      }
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const selectSuggestion = (index: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "select_suggestion", index }));
    }
  };

  const sendText = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        side: "text",
        content: input.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };

  const sendSignedMessage = () => {
    if (!signedSentence.trim()) return;
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        side: "sign",
        content: signedSentence.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    // Clear backend sentence
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "clear" }));
    } else {
      setSignedSentence("");
      setSuggestions([]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessagesSquare className="h-6 w-6" />}
        eyebrow="Live mode"
        title="Live Communication"
        description="A shared conversation surface — signed on the left, typed on the right."
        actions={
          <>
            <Button variant="outline" onClick={() => toast.success("Conversation saved")}>
              <Save /> Save
            </Button>
            <Button variant="outline" onClick={() => setMessages([])}>
              <Trash2 /> Clear Chat
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sign panel */}
        <div className="rounded-3xl border bg-card p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 font-semibold">
                <Hand className="h-4 w-4 text-primary" /> Sign → Text (Webcam)
              </h3>
              <Button size="sm" variant={active ? "destructive" : "default"} onClick={toggle}>
                <Camera /> {active ? "Stop" : "Start Camera"}
              </Button>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black border">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              {!active && (
                <div className="absolute inset-0 grid place-items-center text-white/80 bg-gradient-to-br from-primary/10 to-primary-glow/10">
                  <div className="text-center text-sm font-medium">Camera off</div>
                </div>
              )}
              {active && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
                  Symbol: <span className="capitalize text-white ml-1">{currentSymbol}</span>
                </div>
              )}
            </div>
          </div>

          {active && (
            <div className="space-y-3 pt-2">
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Suggestions:</span>
                  {suggestions.map((sug, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => selectSuggestion(idx + 1)}
                      className="h-7 text-xs px-2.5 bg-background border hover:bg-primary hover:text-primary-foreground"
                    >
                      {sug}
                    </Button>
                  ))}
                </div>
              )}

              {/* Running Transcription sentence */}
              <div className="flex gap-2">
                <div className="flex-1 bg-background border px-3 py-2 rounded-xl text-sm font-semibold min-h-[40px] max-h-[80px] overflow-y-auto break-words text-card-foreground flex items-center">
                  {signedSentence ? (
                    signedSentence
                  ) : (
                    <span className="text-muted-foreground font-normal italic text-xs">
                      Sign words to translate...
                    </span>
                  )}
                </div>
                <Button
                  onClick={sendSignedMessage}
                  disabled={!signedSentence.trim()}
                  className="gradient-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4" /> Send Signed
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Text panel */}
        <div className="flex flex-col justify-between rounded-3xl border bg-card p-5 shadow-card">
          <div>
            <h3 className="mb-3 inline-flex items-center gap-2 font-semibold">
              <TypeIcon className="h-4 w-4 text-primary" /> Text → Sign
            </h3>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendText()}
                placeholder="Type a message to translate into text/signs..."
                className="rounded-xl border"
              />
              <Button onClick={sendText} className="gradient-primary text-primary-foreground rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Messages you send are printed immediately in the shared scrolling chat timeline.
            </p>
          </div>

          <div className="hidden border rounded-2xl bg-muted/20 p-4 mt-6 text-center text-xs text-muted-foreground flex-col items-center justify-center min-h-[140px]">
            <Sparkles className="h-5 w-5 mb-2 text-primary" />
            <span>Interactive sign avatar outputs will render here.</span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="rounded-3xl border bg-card p-5 shadow-card">
        <h3 className="mb-4 font-semibold text-lg flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-primary" /> Conversation Timeline
        </h3>
        <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground italic bg-muted/20 rounded-2xl">
              No chat messages. Type a message or start signing to begin the conversation history.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.side === "text" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm animate-fade-up ${m.side === "text"
                    ? "gradient-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                  }`}
              >
                <div className="text-sm font-semibold">{m.content}</div>
                <div className={`mt-1 text-[10px] ${m.side === "text" ? "text-white/70" : "text-muted-foreground"}`}>
                  {m.side === "sign" ? "👋 Signed" : "⌨️ Typed"} · {m.time}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
