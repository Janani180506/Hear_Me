import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, CameraOff, Copy, Trash2, Hand, Sparkles, Volume2, Loader2, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export const Route = createFileRoute("/sign-to-text")({
  component: SignToText,
  head: () => ({
    meta: [
      { title: "Sign to Text — SignConnect" },
      { name: "description", content: "Real-time sign language recognition via webcam with instant text transcription." },
    ],
  }),
});

type HandStatusType = "ok" | "far" | "border" | "dark" | "none";

function SignToText() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackingLoopRef = useRef<number | null>(null);

  const [active, setActive] = useState(false);
  const [landmarker, setLandmarker] = useState<any>(null);
  const [modelLoading, setModelLoading] = useState(true);

  // Real-time hand check states
  const [handDetected, setHandDetected] = useState(false);
  const [handStatus, setHandStatus] = useState<HandStatusType>("none");

  // States for prediction results
  const [predictionStatus, setPredictionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [predictionLabel, setPredictionLabel] = useState<string>("");
  const [predictionConfidence, setPredictionConfidence] = useState<number | null>(null);
  const [predictionError, setPredictionError] = useState<string>("");

  const [sentence, setSentence] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Accuracy Control threshold: 80% default
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.80);

  // Dynamically load MediaPipe FilesetResolver and HandLandmarker in browser
  useEffect(() => {
    async function loadMediaPipe() {
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const tracker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        setLandmarker(tracker);
        setModelLoading(false);
      } catch (err) {
        console.error("Failed to load local MediaPipe Hand Tracker:", err);
        setModelLoading(false);
        toast.error("Failed to load local hand tracker. Bounding guide rectangle will still display.");
      }
    }
    if (typeof window !== "undefined") {
      loadMediaPipe();
    }
  }, []);

  // Hand Landmark skeleton rendering
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    ctx.save();
    // Mirror coordinates to match scale-x[-1] CSS reflection
    ctx.translate(ctx.canvas.width, 0);
    ctx.scale(-1, 1);

    const connections = [
      [0, 1, 2, 3, 4],       // Thumb
      [0, 5, 6, 7, 8],       // Index
      [9, 10, 11, 12],       // Middle
      [13, 14, 15, 16],      // Ring
      [0, 17, 18, 19, 20],   // Pinky
      [5, 9, 13, 17]         // Knuckles
    ];

    ctx.strokeStyle = "#10B981"; // Emerald-500
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Draw lines
    for (const path of connections) {
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const pt = landmarks[path[i]];
        if (!pt) continue;
        const x = pt.x * ctx.canvas.width;
        const y = pt.y * ctx.canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Connect knuckles
    ctx.beginPath();
    const knuckles = [5, 9, 13, 17];
    for (let i = 0; i < knuckles.length - 1; i++) {
      const p1 = landmarks[knuckles[i]];
      const p2 = landmarks[knuckles[i + 1]];
      if (p1 && p2) {
        ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
        ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
      }
    }
    ctx.stroke();

    // Draw points
    for (const pt of landmarks) {
      if (!pt) continue;
      const x = pt.x * ctx.canvas.width;
      const y = pt.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#EF4444"; // Red-500
      ctx.fill();
    }

    ctx.restore();
  };

  // Local landmark tracking loop with environmental/lighting feedback
  const startTracking = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !landmarker) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const track = () => {
      if (
        video.readyState >= video.HAVE_CURRENT_DATA &&
        !video.paused &&
        !video.ended
      ) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          // 1. Calculate lighting luminance via scaled canvas check
          let avgLuminance = 120;
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = 80;
          tempCanvas.height = 60;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(video, 0, 0, 80, 60);
            const imgData = tempCtx.getImageData(0, 0, 80, 60);
            let totalLuminance = 0;
            for (let i = 0; i < imgData.data.length; i += 4) {
              const r = imgData.data[i];
              const g = imgData.data[i + 1];
              const b = imgData.data[i + 2];
              totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
            }
            avgLuminance = totalLuminance / (imgData.data.length / 4);
          }

          const timestamp = performance.now();
          const results = landmarker.detectForVideo(video, timestamp);

          if (results.landmarks && results.landmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.landmarks[0];
            drawLandmarks(ctx, landmarks);

            // Compute size characteristics
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            for (const pt of landmarks) {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.y > maxY) maxY = pt.y;
            }

            const handW = maxX - minX;
            const handH = maxY - minY;

            if (handW < 0.22 && handH < 0.22) {
              setHandStatus("far");
            } else if (minX < 0.03 || maxX > 0.97 || minY < 0.03 || maxY > 0.97) {
              setHandStatus("border");
            } else if (avgLuminance < 50) {
              setHandStatus("dark");
            } else {
              setHandStatus("ok");
            }
          } else {
            setHandDetected(false);
            setHandStatus("none");
          }
        } catch (e) {
          console.error("Frame landmark detection error:", e);
        }
      }
      trackingLoopRef.current = requestAnimationFrame(track);
    };

    trackingLoopRef.current = requestAnimationFrame(track);
  };

  useEffect(() => {
    if (active && landmarker) {
      startTracking();
    }
    return () => {
      if (trackingLoopRef.current) {
        cancelAnimationFrame(trackingLoopRef.current);
        trackingLoopRef.current = null;
      }
    };
  }, [active, landmarker]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setActive(true);
      setPredictionStatus("idle");
      setPredictionLabel("");
      setPredictionConfidence(null);
      toast.success("Webcam active. Keep landmarks aligned inside the dashed box.");
    } catch {
      toast.error("Camera access denied. Permit hardware configurations to continue.");
    }
  };

  const stopCamera = () => {
    if (trackingLoopRef.current) {
      cancelAnimationFrame(trackingLoopRef.current);
      trackingLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setActive(false);
    setHandDetected(false);
    setHandStatus("none");
    toast.info("Camera and hand detection stopped");
  };

  const predictCurrentFrame = async () => {
    const video = videoRef.current;
    if (!video || !active) {
      toast.error("Start the camera first.");
      return;
    }
    if (!handDetected) {
      toast.error("No hand detected. Realign inside the box before predicting.");
      return;
    }

    setPredictionStatus("loading");
    setPredictionError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to capture frame context.");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((res) => {
          if (res) resolve(res);
          else reject(new Error("Unable to export frame blob."));
        }, "image/jpeg", 0.9);
      });

      await handlePrediction(blob, "capture.jpg");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Capture failed";
      setPredictionStatus("error");
      setPredictionError(msg);
      toast.error(msg);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPredictionStatus("loading");
    setPredictionError("");
    await handlePrediction(file, file.name);
    event.target.value = "";
  };

  const handlePrediction = async (payload: Blob | File, filename: string) => {
    const formData = new FormData();
    formData.append("file", payload, filename);

    const apiUrl = import.meta.env.VITE_PREDICTION_API_URL || "http://127.0.0.1:8000/predict";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Prediction failed");
      }

      setPredictionStatus("success");
      const rawLetter = data?.predicted_class || "Unknown";
      const confidence = typeof data?.confidence === "number" ? data.confidence : 0;
      setPredictionConfidence(confidence);

      // Enforce confidence threshold checks (e.g. 80%)
      if (confidence < confidenceThreshold) {
        setPredictionLabel("Prediction Uncertain");
        setSuggestions([]);
        toast.warning(
          `Prediction confidence (${(confidence * 100).toFixed(1)}%) is below threshold (${(confidenceThreshold * 100).toFixed(0)}%). Ignoring character prediction.`,
          { duration: 5000 }
        );
      } else {
        let letterToAppend = rawLetter;
        let displayLabel = rawLetter;

        if (rawLetter.includes("/")) {
          const parts = rawLetter.split("/").map((item: string) => item.trim());
          letterToAppend = parts[0];
          displayLabel = parts[0];
          setSuggestions(parts);
          toast.info(`Group detected: Appended '${parts[0]}'. Use suggestions to switch candidate.`, { duration: 4000 });
        } else {
          setSuggestions([]);
          toast.success(`Predicted successfully: '${rawLetter}' (${(confidence * 100).toFixed(1)}%)`);
        }

        setPredictionLabel(displayLabel);
        setSentence((prev) => prev + letterToAppend);
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Prediction request failed";
      setPredictionStatus("error");
      setPredictionError(msg);
      toast.error(msg);
    }
  };

  const selectSuggestion = (selectedLetter: string) => {
    setSentence((prev) => {
      if (prev.length === 0) return selectedLetter;
      return prev.slice(0, -1) + selectedLetter;
    });
    toast.success(`Updated last letter to: '${selectedLetter}'`);
  };

  const backspace = () => {
    setSentence((prev) => prev.slice(0, -1));
    toast.info("Removed last letter");
  };

  const clearAll = () => {
    setSentence("");
    setSuggestions([]);
    setPredictionLabel("");
    setPredictionConfidence(null);
    setPredictionStatus("idle");
    toast.success("Cleared transcript and prediction dashboard");
  };

  const copyToClipboard = async () => {
    if (!sentence) return toast.info("No sentence to copy");
    await navigator.clipboard.writeText(sentence);
    toast.success("Transcribed sentence copied!");
  };

  const speakTranscript = () => {
    if (!sentence) return toast.info("Nothing to speak");
    const utterance = new SpeechSynthesisUtterance(sentence.toLowerCase());
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    toast.success("Speaking transcript");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Hand className="h-6 w-6" />}
        eyebrow="Recognition"
        title="Sign to Text (Redesigned)"
        description="Verify hand alignment locally in real time. Click Predict Frame to send the current box capture to the FastAPI ML backend."
      />

      {modelLoading && (
        <div className="flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-4 text-sm animate-fade-in">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Downloading hand landmark tracker assets model. Please wait...</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Card: Camera Frame */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border bg-black shadow-elevated">
            {/* Mirrored webcam user container */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover transform scale-x-[-1]"
            />
            {/* Matched overlay skeleton tracking */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            />

            {/* In-view hand alignment guide box bounding box placement */}
            {active && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[50%] h-[75%] border-4 border-dashed border-white/50 rounded-3xl flex flex-col items-center justify-end pb-6">
                  <div className="rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-bold text-white tracking-widest uppercase backdrop-blur-sm">
                    Position Hand Here
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Camera Alignment Feedback Badge */}
            {active && (
              <div className="absolute top-4 left-4 z-10">
                {handStatus === "ok" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-card backdrop-blur-sm">
                    <CheckCircle2 className="h-4 w-4" /> ✔ HAND DETECTED
                  </span>
                )}
                {handStatus === "far" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-card backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4" /> ✖ MOVE HAND CLOSER
                  </span>
                )}
                {handStatus === "border" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-card backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4" /> ✖ KEEP ENTIRE HAND INSIDE FRAME
                  </span>
                )}
                {handStatus === "dark" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-card backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4" /> ✖ INCREASE LIGHTING
                  </span>
                )}
                {handStatus === "none" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-card backdrop-blur-sm">
                    <XCircle className="h-4 w-4" /> ✖ NO HAND DETECTED
                  </span>
                )}
              </div>
            )}

            {!active && (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/10 to-primary-glow/10 text-center text-white">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 backdrop-blur">
                    <Camera className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white/80">Camera is deactivated</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-2.5">
            {!active ? (
              <Button onClick={startCamera} className="gradient-primary text-primary-foreground shadow-glow h-11 px-5 rounded-2xl">
                <Camera className="mr-2 h-4 w-4" /> Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="destructive" className="h-11 px-5 rounded-2xl">
                <CameraOff className="mr-2 h-4 w-4" /> Stop Camera
              </Button>
            )}

            <Button
              onClick={predictCurrentFrame}
              disabled={!active || predictionStatus === "loading" || !handDetected}
              className="gradient-primary text-primary-foreground shadow-glow h-11 px-5 rounded-2xl disabled:opacity-50"
            >
              {predictionStatus === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calling API...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Predict Frame
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={predictionStatus === "loading"}
              className="h-11 px-5 rounded-2xl border-primary/20 hover:bg-muted"
            >
              <Camera className="mr-2 h-4 w-4 text-primary" /> Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <Button
              variant="outline"
              onClick={clearAll}
              className="h-11 px-5 rounded-2xl border-primary/20 hover:bg-muted text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
          </div>
        </div>

        {/* Right Side: Prediction results */}
        <div className="flex flex-col gap-6">
          {/* Box 1: Current Prediction */}
          <div className="rounded-3xl border bg-card p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" /> Current Prediction
            </h3>

            <div className="min-h-[140px] flex flex-col items-center justify-center rounded-2xl bg-background border p-4 text-center">
              {predictionStatus === "loading" ? (
                <div className="space-y-2 flex flex-col items-center">
                  <Loader2 className="h-9 w-9 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground animate-pulse">Running neural network classification...</p>
                </div>
              ) : predictionStatus === "error" ? (
                <div className="space-y-1">
                  <p className="text-destructive font-semibold">Prediction Failed</p>
                  <p className="text-xs text-muted-foreground max-w-xs">{predictionError}</p>
                </div>
              ) : predictionLabel ? (
                <div className="space-y-3">
                  <div className={`text-4xl font-extrabold tracking-tight uppercase ${predictionLabel === "Prediction Uncertain"
                    ? "text-amber-500 font-bold"
                    : "text-gradient font-black"
                    }`}>
                    {predictionLabel}
                  </div>
                  {predictionConfidence !== null && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${predictionConfidence >= confidenceThreshold
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-500/10 text-amber-500"
                      }`}>
                      Confidence: {(predictionConfidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Position hand and click "Predict Frame" or upload an image to run gesture prediction.
                </p>
              )}
            </div>

            {/* Accuracy Threshold Control */}
            <div className="rounded-2xl border bg-background p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" /> Confidence Threshold:
                </span>
                <span className="font-mono text-primary font-bold text-sm">{(confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[confidenceThreshold]}
                onValueChange={(val) => setConfidenceThreshold(val[0])}
                min={0.50}
                max={0.95}
                step={0.05}
                className="py-1 cursor-ew-resize"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Predictions below this value are set to "Prediction Uncertain" and will not be appended.
              </p>
            </div>

            {/* Candidate suggestions row (for groups like A/E/S/T) */}
            {suggestions.length > 0 && predictionLabel !== "Prediction Uncertain" && (
              <div className="space-y-2 animate-fade-in">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Select candidate option:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((sug) => (
                    <Button
                      key={sug}
                      size="sm"
                      variant="outline"
                      onClick={() => selectSuggestion(sug)}
                      className={`border-primary/20 bg-background hover:bg-primary hover:text-primary-foreground rounded-xl transition-all ${sug === predictionLabel ? "bg-primary text-primary-foreground font-bold" : ""
                        }`}
                    >
                      {sug}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Box 2: Accumulated Sentence */}
          <div className="rounded-3xl border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Transcribed Sentence</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary uppercase">
                Accumulated
              </span>
            </div>

            <div className="min-h-[140px] max-h-[220px] overflow-y-auto rounded-2xl bg-background border p-4 text-lg font-bold leading-relaxed break-all text-card-foreground">
              {sentence ? (
                sentence
              ) : (
                <span className="text-sm font-normal text-muted-foreground italic">
                  Transcribed text will accumulate characters here on button clicks...
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                disabled={!sentence}
                className="flex-1 rounded-xl h-10"
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button
                variant="outline"
                onClick={speakTranscript}
                disabled={!sentence}
                className="flex-1 rounded-xl h-10"
              >
                <Volume2 className="mr-2 h-4 w-4" /> Speak
              </Button>
              <Button
                variant="outline"
                onClick={backspace}
                disabled={!sentence}
                className="rounded-xl h-10 px-3 hover:text-destructive"
                title="Backspace"
              >
                Delete Last
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom XCircle overlay icon replacement imports
function XCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
