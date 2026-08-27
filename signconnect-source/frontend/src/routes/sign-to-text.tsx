import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Camera,
  Copy,
  Trash2,
  Hand,
  Sparkles,
  Volume2,
  Loader2,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  CornerDownLeft,
  Delete,
  Type,
  RefreshCw,
  Check
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api-config";
import { isDuplicatePrediction } from "@/lib/text-utils";
import { getWordSuggestions } from "@/lib/word-dictionary";

export const Route = createFileRoute("/sign-to-text")({
  component: SignToText,
  head: () => ({
    meta: [
      { title: "Sign to Text — SignConnect" },
      { name: "description", content: "Assistive sign language recognition engine supporting ASL alphabet fingerspelling, prefix word suggestions, and natural TTS speech." },
    ],
  }),
});

type HandStatusType = "ok" | "far" | "border" | "dark" | "none";

function SignToText() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackingLoopRef = useRef<number | null>(null);

  // Lifecycle & concurrency guards
  const isMountedRef = useRef<boolean>(true);
  const isPredictingRef = useRef<boolean>(false);
  const landmarkerRef = useRef<any>(null);
  const isLoadingMediaPipeRef = useRef<boolean>(false);

  // Tracking state refs for letter stabilization & debouncing
  const lastPredictionRef = useRef<{ char: string; time: number }>({ char: "", time: 0 });
  const handAbsenceFramesRef = useRef<number>(0);

  // Tab & mode states
  const [activeTab, setActiveTab] = useState<"webcam" | "image">("webcam");
  const [active, setActive] = useState<boolean>(false);
  const [landmarker, setLandmarker] = useState<any>(null);
  const [mediaPipeLoading, setMediaPipeLoading] = useState<boolean>(false);
  const [mediaPipeError, setMediaPipeError] = useState<string | null>(null);

  // Real-time hand tracking states
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [handStatus, setHandStatus] = useState<HandStatusType>("none");

  // Recognition & prediction states (Alphabet Mode)
  // predictionLabel = currentLetter (e.g. "E")
  const [predictionStatus, setPredictionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [predictionLabel, setPredictionLabel] = useState<string>("");
  const [predictionConfidence, setPredictionConfidence] = useState<number | null>(null);
  const [predictionError, setPredictionError] = useState<string>("");

  // Buffer & Sentence States (SINGLE SOURCE OF TRUTH)
  // currentLetters = currentBuffer (spelled word in progress, e.g. "LOVE")
  const [currentLetters, setCurrentLetters] = useState<string>("");
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);

  // sentenceWords = list of confirmed words (e.g. ["LOVE", "WATER"])
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);

  // DERIVED STATE: completeSentence is calculated directly from sentenceWords
  const completeSentence = sentenceWords.join(" ");

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.65);

  // Track component mount status for cleanup safety
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Safe update for prefix word suggestions whenever currentLetters changes
  useEffect(() => {
    const buffer = (currentLetters ?? "").trim();
    if (!buffer) {
      setSuggestedWords([]);
      return;
    }

    const suggestions = getWordSuggestions(buffer, 5);
    console.log(`[SignToText] CURRENT BUFFER = "${buffer}" | SUGGESTED WORDS =`, suggestions);
    setSuggestedWords(Array.isArray(suggestions) ? suggestions : []);
  }, [currentLetters]);

  // Safe Lazy Loader for MediaPipe HandLandmarker with GPU -> CPU fallback
  const loadMediaPipe = async () => {
    if (landmarkerRef.current || isLoadingMediaPipeRef.current) return;
    isLoadingMediaPipeRef.current = true;
    setMediaPipeLoading(true);
    setMediaPipeError(null);

    try {
      console.log("[SignToText] Initializing MediaPipe HandLandmarker...");
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );

      const taskPath = typeof window !== "undefined" ? `${window.location.origin}/hand_landmarker.task` : "/hand_landmarker.task";

      let tracker: any = null;
      try {
        tracker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: taskPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
      } catch (gpuErr) {
        console.warn("[SignToText] GPU delegate failed, falling back to CPU delegate:", gpuErr);
        tracker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: taskPath,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
      }

      if (isMountedRef.current) {
        landmarkerRef.current = tracker;
        setLandmarker(tracker);
        setMediaPipeLoading(false);
        console.log("[SignToText] MediaPipe HandLandmarker initialized successfully.");
      }
    } catch (err: any) {
      const errMsg = err?.message || "Failed to load MediaPipe Hand Tracking.";
      console.error("[SignToText] MediaPipe initialization failed:", err);
      if (isMountedRef.current) {
        setMediaPipeError(errMsg);
        setMediaPipeLoading(false);
      }
    } finally {
      isLoadingMediaPipeRef.current = false;
    }
  };

  // Load MediaPipe when webcam tab is active
  useEffect(() => {
    if (activeTab === "webcam" && !landmarkerRef.current && !mediaPipeError) {
      loadMediaPipe();
    }
  }, [activeTab]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    if (!ctx || !landmarks || !Array.isArray(landmarks)) return;
    ctx.save();
    ctx.translate(ctx.canvas.width, 0);
    ctx.scale(-1, 1);

    const connections = [
      [0, 1, 2, 3, 4],
      [0, 5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
      [0, 17, 18, 19, 20],
      [5, 9, 13, 17]
    ];

    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

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

    for (const pt of landmarks) {
      if (!pt) continue;
      const x = pt.x * ctx.canvas.width;
      const y = pt.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#EF4444";
      ctx.fill();
    }

    ctx.restore();
  };

  const startTracking = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const tracker = landmarkerRef.current;
    if (!video || !canvas || !tracker) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const track = () => {
      if (!isMountedRef.current) return;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const timestamp = performance.now();
          const results = tracker.detectForVideo(video, timestamp);

          if (results && results.landmarks && results.landmarks.length > 0) {
            if (isMountedRef.current) {
              setHandDetected(true);
              setHandStatus("ok");
            }
            drawLandmarks(ctx, results.landmarks[0]);
            handAbsenceFramesRef.current = 0;
          } else {
            if (isMountedRef.current) {
              setHandDetected(false);
              setHandStatus("none");
            }
            handAbsenceFramesRef.current += 1;
            // Reset duplicate debounce memory if hand is absent for 3+ consecutive frames
            if (handAbsenceFramesRef.current >= 3) {
              lastPredictionRef.current = { char: "", time: 0 };
            }
          }
        } catch (e) {
          // Ignore transient tracking frame errors safely
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
      console.log("[SignToText] Starting camera...");
      if (!landmarkerRef.current && !mediaPipeLoading) {
        loadMediaPipe();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setActive(true);
      setPredictionStatus("idle");
      console.log("[SignToText] Camera started successfully.");
      toast.success("Camera active. Show hand gesture inside frame.");
    } catch (err: any) {
      console.error("[SignToText] Camera access error:", err);
      toast.error("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    console.log("[SignToText] Stopping camera...");
    if (trackingLoopRef.current) {
      cancelAnimationFrame(trackingLoopRef.current);
      trackingLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (isMountedRef.current) {
      setActive(false);
      setHandDetected(false);
      setHandStatus("none");
    }
    console.log("[SignToText] Camera stopped.");
  };

  const speakText = (textToSpeak: string) => {
    const cleanSentence = textToSpeak.trim();
    if (!cleanSentence) return;

    fetch(`${API_BASE}/api/tts/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanSentence, language: "en" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.audio_base64) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
          audio.play();
        } else if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanSentence);
          window.speechSynthesis.speak(utterance);
        }
      })
      .catch(() => {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanSentence);
          window.speechSynthesis.speak(utterance);
        }
      });
  };

  const handleClearAll = () => {
    setSentenceWords([]);
    setCurrentLetters("");
    setSuggestedWords([]);
    setPredictionLabel("");
    setPredictionConfidence(null);
    setPredictionStatus("idle");
    lastPredictionRef.current = { char: "", time: 0 };
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    toast.info("Cleared all text output and buffers.");
  };

  const handleBackspaceSentence = () => {
    if (currentLetters) {
      setCurrentLetters((prev) => (typeof prev === "string" ? prev.slice(0, -1) : ""));
    } else {
      setSentenceWords((prev) => {
        if (prev.length === 0) return [];
        const next = [...prev];
        next.pop();
        return next;
      });
    }
  };

  // WORD COMMIT FUNCTION (handleWordSelection)
  const handleWordSelection = (word: string) => {
    if (!word || typeof word !== "string") return;
    const normalizedWord = word.trim().toUpperCase();
    if (!normalizedWord) return;

    console.log("COMMITTING WORD =", normalizedWord);
    setSentenceWords((prevWords) => {
      const updated = [...prevWords, normalizedWord];
      console.log("[SignToText] Sentence words updated:", updated);
      return updated;
    });

    // Clear letter buffer, word suggestions, and prediction label
    setCurrentLetters("");
    setSuggestedWords([]);
    setPredictionLabel("");
    lastPredictionRef.current = { char: "", time: 0 };
    toast.success(`Added "${normalizedWord}" to sentence.`);
  };

  // ASL Alphabet Single-Letter Prediction (Webcam / Upload Image)
  const handleAlphabetPrediction = async (payload: Blob | File, filename: string) => {
    if (!payload || payload.size === 0) return;

    const formData = new FormData();
    formData.append("file", payload, filename);

    setPredictionStatus("loading");
    setPredictionError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status} (${response.statusText})`);
      }

      const data = await response.json();

      if (!data || data.ok === false) {
        const errDetail = data?.error || data?.detail || "No valid hand gesture detected";
        if (isMountedRef.current) {
          setPredictionStatus("idle");
          setPredictionError(errDetail);
        }
        return;
      }

      const letter = (data?.letter || data?.predicted_class || "").toUpperCase();
      const confidence = typeof data?.confidence === "number" ? data.confidence : 0.9;

      if (!isMountedRef.current) return;

      setPredictionConfidence(confidence);

      if (confidence < confidenceThreshold) {
        setPredictionLabel("Uncertain");
        setPredictionStatus("idle");
      } else {
        setPredictionStatus("success");
        setPredictionLabel(letter);

        const now = Date.now();
        const isDup = isDuplicatePrediction(
          lastPredictionRef.current.char,
          lastPredictionRef.current.time,
          letter,
          now,
          1000
        );

        if (isDup) {
          return;
        }

        lastPredictionRef.current = { char: letter, time: now };

        console.log("[SignToText] Predicted letter:", letter);

        if (letter === "SPACE" || letter === "SPACE_GESTURE") {
          if (currentLetters.trim()) {
            handleWordSelection(currentLetters.trim());
          }
          return;
        } else if (letter === "BACKSPACE" || letter === "BACKSPACE_GESTURE") {
          handleBackspaceSentence();
          return;
        }

        // Accumulate letter into currentLetters buffer
        setCurrentLetters((prev) => {
          const nextBuffer = typeof prev === "string" ? prev + letter : letter;
          console.log("[SignToText] Current buffer:", nextBuffer);
          return nextBuffer;
        });
        toast.success(`Recognized sign letter: '${letter}'`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[SignToText] /predict request exception:", error);
      let errMsg = "Unable to process current frame.";
      if (error?.name === "AbortError") {
        errMsg = "Prediction timed out (server took >12s).";
      } else if (error?.message) {
        errMsg = error.message;
      }
      if (isMountedRef.current) {
        setPredictionStatus("error");
        setPredictionError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      if (isMountedRef.current) {
        isPredictingRef.current = false;
      }
    }
  };

  // Safe frame prediction trigger with in-flight locking & element validation
  const predictCurrentFrame = async () => {
    if (isPredictingRef.current) return;

    const video = videoRef.current;
    if (!video || !active) return toast.error("Start camera first.");
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    isPredictingRef.current = true;

    try {
      const canvas = document.createElement("canvas");
      const targetWidth = Math.min(video.videoWidth || 640, 640);
      const targetHeight = Math.min(video.videoHeight || 480, 480);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        isPredictingRef.current = false;
        return;
      }

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.75));
      if (blob && blob.size > 0) {
        await handleAlphabetPrediction(blob, "webcam_frame.jpg");
      } else {
        isPredictingRef.current = false;
      }
    } catch {
      isPredictingRef.current = false;
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleAlphabetPrediction(file, file.name);
    e.target.value = "";
  };



  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 p-4 md:p-8">
      <PageHeader
        icon={<Hand className="h-6 w-6" />}
        eyebrow="Assistive Communication"
        title="Sign to Text Engine"
        description="Recognize ASL Alphabet gestures via Webcam or Image, explore prefix word suggestions, and convert signs to natural speech."
      />

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs bg-card border p-1 rounded-xl shadow-sm mb-6">
          <TabsTrigger value="webcam" className="gap-2 text-xs font-semibold rounded-lg">
            <Camera className="h-4 w-4" /> Live Webcam
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-2 text-xs font-semibold rounded-lg">
            <Upload className="h-4 w-4" /> Upload Image
          </TabsTrigger>
        </TabsList>

        {/* WEBCAM TAB — ASL ALPHABET & WORD SUGGESTIONS */}
        <TabsContent value="webcam" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border shadow-md">
              <CardContent className="p-4 flex flex-col items-center gap-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border shadow-inner">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${active ? "" : "hidden"}`}
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />

                  {!active && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/40 p-4 text-center">
                      <Camera className="h-12 w-12 text-primary/60" />
                      <p className="text-sm font-medium">Webcam is currently inactive</p>
                      {mediaPipeError && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg max-w-xs flex items-center gap-1.5 justify-center">
                          <AlertCircle className="h-4 w-4 shrink-0" /> Hand tracking service unavailable.
                        </div>
                      )}
                    </div>
                  )}

                  {active && handDetected && (
                    <Badge className="absolute top-3 left-3 bg-emerald-500 text-white font-bold gap-1 shadow-md">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Hand Tracked
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                  <div className="flex items-center gap-2">
                    {!active ? (
                      <Button onClick={startCamera} className="gap-2 gradient-primary shadow-glow">
                        <Camera className="h-4 w-4" /> Start Camera
                      </Button>
                    ) : (
                      <Button onClick={stopCamera} variant="outline" className="gap-2 text-destructive">
                        Stop Camera
                      </Button>
                    )}

                    {mediaPipeError && (
                      <Button onClick={loadMediaPipe} variant="outline" size="sm" className="gap-1.5 text-xs">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry Hand Tracking
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={predictCurrentFrame}
                    disabled={!active || predictionStatus === "loading"}
                    className="gap-2 font-semibold shadow-md"
                  >
                    {predictionStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Predict Current Frame
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results & Recognized Sign Card */}
            <Card className="border shadow-md">
              <CardContent className="p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                    <span>PREDICTED ASL LETTER</span>
                    <Badge variant="outline" className="text-[10px]">ASL Model</Badge>
                  </h3>
                  <div className="min-h-[5.5rem] rounded-2xl border bg-card p-4 flex flex-col items-center justify-center shadow-inner">
                    <span className="text-5xl font-extrabold text-gradient">
                      {predictionLabel || "—"}
                    </span>
                    {predictionConfidence !== null && (
                      <span className="text-xs text-muted-foreground mt-1 font-medium">
                        Confidence: {(predictionConfidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Current Buffer Display & Direct Add Button */}
                {currentLetters && (
                  <div className="p-3 rounded-xl border bg-primary/5 flex flex-col items-center gap-2 text-center">
                    <div className="text-xs font-bold text-muted-foreground uppercase">
                      Current Buffer: <span className="text-primary font-black text-sm">{currentLetters}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleWordSelection(currentLetters)}
                      className="w-full gap-1.5 font-bold gradient-primary shadow-sm text-xs py-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add "{currentLetters}" to Sentence
                    </Button>
                  </div>
                )}

                {/* Inline Status Message */}
                {predictionError && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{predictionError}</span>
                  </div>
                )}

                {/* Confidence Threshold Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Confidence Threshold:</span>
                    <span>{(confidenceThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[confidenceThreshold]}
                    onValueChange={(val) => setConfidenceThreshold(val[0])}
                    min={0.3}
                    max={0.95}
                    step={0.05}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* IMAGE UPLOAD TAB — ASL ALPHABET */}
        <TabsContent value="image" className="space-y-6">
          <Card className="max-w-xl mx-auto border shadow-md">
            <CardContent className="p-8 flex flex-col items-center gap-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Upload Alphabet Sign Image</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a clear image file (.jpg, .png) containing a static ASL alphabet gesture.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload-input"
              />

              <label htmlFor="image-upload-input">
                <Button asChild className="gap-2 cursor-pointer shadow-glow gradient-primary">
                  <span>
                    <Upload className="h-4 w-4" /> Select Image File
                  </span>
                </Button>
              </label>

              {predictionLabel && (
                <div className="mt-4 p-4 rounded-xl border bg-card w-full text-center space-y-3">
                  <div className="text-xs text-muted-foreground uppercase font-bold">Predicted ASL Letter</div>
                  <div className="text-4xl font-black text-primary">{predictionLabel}</div>
                  {currentLetters && (
                    <div className="p-3 rounded-xl border bg-primary/5 flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        Current Buffer: <span className="text-primary font-black text-sm">{currentLetters}</span>
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleWordSelection(currentLetters)}
                        className="w-full gap-1.5 font-bold gradient-primary shadow-sm text-xs py-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add "{currentLetters}" to Sentence
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      {/* GLOBAL CURRENT BUFFER & WORD SUGGESTIONS CARD (ALWAYS VISIBLE WHEN LETTERS EXIST) */}
      <Card className="border shadow-md bg-gradient-to-r from-primary/5 via-card to-background">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Current Buffer (Word Being Spelled)</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentLetters((prev) => (typeof prev === "string" ? prev.slice(0, -1) : ""))}
                disabled={!currentLetters}
                className="gap-1 text-xs"
              >
                <Delete className="h-3.5 w-3.5" /> Backspace Letter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentLetters("")}
                disabled={!currentLetters}
                className="gap-1 text-xs"
              >
                Clear Buffer
              </Button>
              {currentLetters.trim() !== "" && (
                <Button
                  size="sm"
                  onClick={() => handleWordSelection(currentLetters)}
                  className="gap-1.5 text-xs font-bold gradient-primary shadow-glow"
                >
                  <CornerDownLeft className="h-3.5 w-3.5" /> Add "{currentLetters}"
                </Button>
              )}
            </div>
          </div>

          {/* Current Buffer Display Box */}
          <div className="min-h-[3.5rem] rounded-xl border bg-background p-4 flex items-center justify-between shadow-inner">
            <span className="text-3xl font-black tracking-widest text-primary">
              {currentLetters || <span className="text-sm font-normal text-muted-foreground italic">Sign ASL letters to spell a word</span>}
            </span>
            {currentLetters && (
              <Badge variant="secondary" className="font-mono text-xs">
                {currentLetters.length} letters
              </Badge>
            )}
          </div>

          {/* SUGGESTED WORDS & DYNAMIC ADD BUTTONS */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Suggested Words (Click to Add to Sentence):
            </span>
            <div className="flex flex-wrap gap-2">
              {/* Dynamic Add Current Buffer Button */}
              {currentLetters.trim() !== "" && (
                <Button
                  size="sm"
                  onClick={() => handleWordSelection(currentLetters)}
                  className="gap-1.5 font-bold gradient-primary text-white shadow-glow rounded-lg text-sm px-4 py-2"
                >
                  <Plus className="h-4 w-4" /> Add "{currentLetters.trim()}"
                </Button>
              )}

              {/* Prefix Dictionary Suggestions */}
              {Array.isArray(suggestedWords) &&
                suggestedWords
                  .filter((w) => w !== currentLetters.trim())
                  .map((word) => (
                    <Button
                      key={word}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleWordSelection(word)}
                      className="gap-1.5 font-bold transition-all shadow-sm rounded-lg text-sm px-4 py-2 hover:bg-primary hover:text-primary-foreground"
                    >
                      <Plus className="h-4 w-4 opacity-80" />
                      {word}
                    </Button>
                  ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TRANSCRIBED TEXT OUTPUT CARD & TTS CONTROLS */}
      <Card className="border-primary/20 bg-card/60 shadow-md">
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Hand className="h-4 w-4 text-primary" />
              TRANSCRIBED TEXT OUTPUT
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentLetters && currentLetters.trim()) {
                    handleWordSelection(currentLetters.trim());
                  }
                }}
                disabled={!currentLetters}
              >
                + Space
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackspaceSentence}
                disabled={!completeSentence && !currentLetters}
              >
                Backspace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={!completeSentence && !currentLetters && !predictionLabel}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (completeSentence) {
                    navigator.clipboard.writeText(completeSentence);
                    toast.success("Copied sentence to clipboard!");
                  }
                }}
                disabled={!completeSentence}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>

          {/* DIRECT TRANSCRIPT RENDERING */}
          <div className="min-h-[4.5rem] rounded-xl border bg-background p-4 text-2xl font-black tracking-wide shadow-inner leading-relaxed text-foreground flex items-center">
            {completeSentence ? (
              <span>{completeSentence}</span>
            ) : (
              <span className="text-sm font-normal text-muted-foreground italic">
                Formed sentences will appear heres
              </span>
            )}
          </div>

          {/* TTS USES EXACT completeSentence STATE */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              size="lg"
              className="gap-2 font-bold text-base shadow-glow gradient-primary"
              onClick={() => speakText(completeSentence)}
              disabled={!completeSentence.trim()}
            >
              <Volume2 className="h-5 w-5" /> Speak Sentence
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
