import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Moon, Sun, Contrast, Type, Languages } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({
    meta: [
      { title: "Settings — SignConnect" },
      { name: "description", content: "Customize theme, font size, contrast and language preferences for SignConnect." },
    ],
  }),
});

function Settings() {
  const [dark, setDark] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState([16]);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("sc-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize[0]}px`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.filter = highContrast ? "contrast(1.2)" : "";
    return () => {
      document.documentElement.style.filter = "";
    };
  }, [highContrast]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SettingsIcon className="h-6 w-6" />}
        eyebrow="Preferences"
        title="Settings"
        description="Adjust SignConnect to match your accessibility needs."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Row
          icon={dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          title="Dark mode"
          description="Switch between light and dark themes."
          control={<Switch checked={dark} onCheckedChange={setDark} />}
        />

        <Row
          icon={<Contrast className="h-5 w-5" />}
          title="High-contrast mode"
          description="Improves legibility for low-vision users."
          control={<Switch checked={highContrast} onCheckedChange={setHighContrast} />}
        />

        <Row
          icon={<Type className="h-5 w-5" />}
          title="Font size"
          description={`Base size: ${fontSize[0]}px`}
          control={
            <div className="w-40">
              <Slider value={fontSize} onValueChange={setFontSize} min={14} max={22} step={1} />
            </div>
          }
        />

        <Row
          icon={<Languages className="h-5 w-5" />}
          title="App language"
          description="Interface language for SignConnect."
          control={
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>

      <div className="flex justify-end">
        <Button className="gradient-primary text-primary-foreground" onClick={() => toast.success("Preferences saved")}>
          Save preferences
        </Button>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
