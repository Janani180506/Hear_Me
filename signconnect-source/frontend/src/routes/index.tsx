import { createFileRoute, Link } from "@tanstack/react-router";
import { Hand, Type, LayoutGrid, ArrowRight, Sparkles, Globe, Shield } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "SignConnect — Communication without barriers" },
      {
        name: "description",
        content:
          "Real-time sign-to-text, text-to-sign avatar, and TouchSpeak AAC board built for the deaf and mute community.",
      },
    ],
  }),
});

const FEATURES = [
  {
    to: "/sign-to-text",
    icon: Hand,
    title: "Sign to Text",
    desc: "Live webcam gesture recognition with instant transcription & confidence scores.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    to: "/text-to-sign",
    icon: Type,
    title: "Text to Sign",
    desc: "Type a sentence and watch a 3D avatar sign it back with playback controls.",
    color: "from-sky-500 to-blue-600",
  },
  {
    to: "/communication-board",
    icon: LayoutGrid,
    title: "TouchSpeak Board",
    desc: "AAC communication board with multi-language TTS, smart phrase predictions and 🚨 Emergency Help.",
    color: "from-purple-500 to-indigo-600",
  },
] as const;

const CAPABILITIES = [
  {
    
    title: "Sign Recognition",
    desc: "Recognize hand gestures and convert them into text.",
  },
  {
    
    title: "Speech Output",
    desc: "Convert communication into clear spoken audio.",
  },
  {
    
    title: "TouchSpeak Board",
    desc: "Use customizable communication cards for everyday needs.",
  },
  {
    
    title: "Caregiver Support",
    desc: "Help users communicate important needs to their caregivers.",
  },
];

function Home() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-primary-foreground shadow-elevated sm:p-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered accessibility
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Communication without barriers.
          </h1>
          <p className="mt-4 text-base text-white/85 sm:text-lg">
            SignConnect uses computer vision and a 3D avatar to translate between
            sign language, text and speech — so everyone can be heard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/sign-to-text"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-glow hover:opacity-95"
            >
              Start signing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/text-to-sign"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              Text to Sign
            </Link>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl bg-white/10 p-4 backdrop-blur flex flex-col gap-1"
            >
              <div className="text-2xl">{c.icon}</div>
              <div className="text-sm font-bold text-white">{c.title}</div>
              <div className="text-xs text-white/80 leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <PageHeader
          eyebrow="Explore"
          title="Everything you need in one place"
          description="Focused tools that bridge sign, text and speech in real time."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ to, icon: Icon, title, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="group relative overflow-hidden rounded-3xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div
                className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
              />
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-card`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Shield, title: "Privacy first", desc: "Camera stream is processed on-device whenever possible." },
          { icon: Globe, title: "Multi-language", desc: "Supports ASL, ISL sign systems." },
          { icon: Sparkles, title: "Beautifully accessible", desc: "Large targets, high contrast and screen-reader friendly." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl glass p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h4 className="mt-3 font-semibold">{f.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
