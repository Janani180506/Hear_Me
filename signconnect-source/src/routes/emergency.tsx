import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Siren, MapPin, Phone, Share2, X, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EMERGENCY_CONTACTS } from "@/lib/dummy-data";

export const Route = createFileRoute("/emergency")({
  component: Emergency,
  head: () => ({
    meta: [
      { title: "Emergency SOS — SignConnect" },
      { name: "description", content: "One-tap emergency alert with live location sharing to your trusted contacts." },
    ],
  }),
});

interface Coords {
  lat: number;
  lon: number;
}

function Emergency() {
  const [triggered, setTriggered] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = () =>
    new Promise<Coords>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation unavailable"));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        (e) => reject(e),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const triggerSOS = async () => {
    setLoading(true);
    try {
      const c = await requestLocation();
      setCoords(c);
      setTriggered(true);
      toast.success("SOS sent to your emergency contacts");
    } catch {
      // fallback demo location
      const fallback = { lat: 40.7128, lon: -74.006 };
      setCoords(fallback);
      setTriggered(true);
      toast.warning("Location unavailable — using approximate location");
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setTriggered(false);
    setCoords(null);
    toast.info("SOS cancelled");
  };

  const share = async () => {
    if (!coords) return;
    const url = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}#map=16/${coords.lat}/${coords.lon}`;
    try {
      if (navigator.share) await navigator.share({ title: "My location", url });
      else await navigator.clipboard.writeText(url);
      toast.success("Location link ready");
    } catch { /* noop */ }
  };

  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01}%2C${
        coords.lat - 0.008
      }%2C${coords.lon + 0.01}%2C${coords.lat + 0.008}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Siren className="h-6 w-6" />}
        eyebrow="Emergency"
        title="SOS with live location"
        description="Tap the button to instantly share your location with your emergency contacts."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* SOS button */}
        <div className="rounded-3xl border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex flex-col items-center">
            <button
              onClick={triggerSOS}
              disabled={loading || triggered}
              aria-label="Trigger emergency SOS"
              className={`grid h-56 w-56 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-elevated transition-transform hover:scale-105 active:scale-95 disabled:opacity-80 ${
                !triggered ? "animate-pulse-ring" : ""
              }`}
            >
              <div>
                <Siren className="mx-auto h-16 w-16" />
                <div className="mt-2 text-3xl font-black tracking-wider">SOS</div>
                <div className="text-xs uppercase opacity-90">
                  {loading ? "Sending..." : triggered ? "Alert sent" : "Tap to alert"}
                </div>
              </div>
            </button>
            <p className="mt-6 max-w-sm text-sm text-muted-foreground">
              Your live location, timestamp and an emergency message will be sent to your saved contacts.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={share} disabled={!coords} variant="outline">
              <Share2 /> Share Live Location
            </Button>
            <a
              href={`tel:${EMERGENCY_CONTACTS[0].phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground"
            >
              <Phone className="h-4 w-4" /> Call Contact
            </a>
            {triggered && (
              <Button variant="outline" onClick={cancel}>
                <X /> Cancel SOS
              </Button>
            )}
          </div>
        </div>

        {/* Map + status */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border shadow-card">
            {mapSrc ? (
              <iframe
                title="Live location"
                src={mapSrc}
                className="h-80 w-full"
                loading="lazy"
              />
            ) : (
              <div className="grid h-80 w-full place-items-center bg-muted text-muted-foreground">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-2 text-sm">Trigger SOS to reveal your location on the map.</p>
                </div>
              </div>
            )}
          </div>

          {triggered && coords && (
            <div className="rounded-2xl border bg-card p-5 shadow-card animate-fade-up">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Alert sent successfully</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latitude</span>
                  <span className="font-mono">{coords.lat.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longitude</span>
                  <span className="font-mono">{coords.lon.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h4 className="mb-3 font-semibold">Emergency contacts</h4>
            <ul className="space-y-2">
              {EMERGENCY_CONTACTS.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.relation} · {c.phone}</div>
                  </div>
                  <a
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg gradient-primary text-primary-foreground"
                    aria-label={`Call ${c.name}`}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
