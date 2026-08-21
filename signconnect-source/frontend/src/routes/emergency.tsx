import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Siren, MapPin, Phone, Share2, X, Clock, Navigation, MessageCircle, ExternalLink, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/emergency")({
  component: Emergency,
  head: () => ({
    meta: [
      { title: "Emergency SOS — SignConnect" },
      { name: "description", content: "One-tap emergency alert with live GPS location tracking and caregiver notification." },
    ],
  }),
});

interface Coords {
  lat: number;
  lon: number;
  accuracy?: number;
  updatedAt?: string;
}

interface Caregiver {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email?: string;
  is_primary?: boolean;
}

export function Emergency() {
  const [triggered, setTriggered] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"locating" | "active" | "error">("locating");
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  // Fetch registered caregivers from database
  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/caregivers");
      if (res.ok) {
        const data = await res.json();
        setCaregivers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn("[Emergency SOS] Failed to fetch caregivers:", e);
    }
  };

  // Continuous Live GPS tracking on component mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updatedAt: new Date().toLocaleTimeString(),
        });
        setLocationStatus("active");
      },
      (err) => {
        console.warn("GPS tracking error:", err.message);
        setLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const sendWhatsAppSOS = (targetCaregiver: Caregiver, lat: number, lng: number, messageText: string) => {
    const cleanPhone = targetCaregiver.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank");
  };

  const triggerSOS = async () => {
    // 1. Check if caregivers are registered
    if (!caregivers || caregivers.length === 0) {
      toast.error("No caregiver is registered. Please add a caregiver first.");
      return;
    }

    setLoading(true);

    // 2. Request browser location permission and get current coordinates
    let lat: number;
    let lng: number;

    if (!navigator.geolocation) {
      toast.error("Unable to get your current location. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      setCoords({
        lat,
        lon: lng,
        accuracy: pos.coords.accuracy,
        updatedAt: new Date().toLocaleTimeString(),
      });
      setLocationStatus("active");
    } catch (err: any) {
      console.error("[Emergency SOS] Geolocation error:", err);
      if (err?.code === 1) { // PERMISSION_DENIED
        toast.error("Location permission is required to send your current location.");
      } else {
        toast.error("Unable to get your current location. Please try again.");
      }
      setLoading(false);
      return;
    }

    // 3. Create Google Maps link & formatted SOS Message
    const googleMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const sosMessage = `🚨 EMERGENCY SOS\n\nI need immediate assistance.\n\nMy current location:\n${googleMapsLink}\n\nPlease help me immediately.`;

    // 4. Identify primary/target caregiver
    const primaryCaregiver = caregivers.find((c) => c.is_primary) || caregivers[0];

    // 5. Open WhatsApp with click-to-chat
    sendWhatsAppSOS(primaryCaregiver, lat, lng, sosMessage);

    // 6. Save SOS event to backend database
    try {
      await fetch("http://localhost:8000/api/emergency/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "Alex Rivera",
          caregiver_name: primaryCaregiver.name,
          caregiver_phone: primaryCaregiver.phone,
          location: { latitude: lat, longitude: lng },
          message: sosMessage,
          status: "Active",
        }),
      });
    } catch (e) {
      console.error("[Emergency SOS] DB log error:", e);
    }

    setTriggered(true);
    setLoading(false);
    toast.success("✓ Emergency SOS sent to caregiver");
  };

  const cancelSOS = () => {
    setTriggered(false);
    toast.info("SOS alert status reset.");
  };

  const shareLiveLocation = async () => {
    if (!coords) return toast.error("Location not available yet.");
    const googleMapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lon}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Emergency Live Location", url: googleMapsLink });
      } else {
        await navigator.clipboard.writeText(googleMapsLink);
        toast.success("Location link copied to clipboard!");
      }
    } catch {
      /* noop */
    }
  };

  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.008}%2C${
        coords.lat - 0.006
      }%2C${coords.lon + 0.008}%2C${coords.lat + 0.006}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Siren className="h-6 w-6" />}
        eyebrow="Emergency"
        title="SOS with Live Location"
        description="One-tap emergency panic alert with continuous live GPS tracking, Google Maps link, and direct WhatsApp caregiver dispatch."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Panic SOS Button & Caregivers */}
        <div className="rounded-3xl border bg-card p-8 text-center shadow-card flex flex-col items-center justify-between gap-6">
          <div className="mx-auto flex flex-col items-center">
            <button
              onClick={triggerSOS}
              disabled={loading}
              aria-label="Trigger emergency SOS"
              className={`grid h-56 w-56 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-elevated transition-transform hover:scale-105 active:scale-95 disabled:opacity-80 ${
                !triggered ? "animate-pulse-ring" : ""
              }`}
            >
              <div>
                <Siren className="mx-auto h-16 w-16" />
                <div className="mt-2 text-3xl font-black tracking-wider">SOS</div>
                <div className="text-xs uppercase font-bold opacity-90 mt-1">
                  {loading ? "Locating..." : triggered ? "Sent to Caregiver" : "Tap to Alert"}
                </div>
              </div>
            </button>

            <p className="mt-6 max-w-sm text-xs text-muted-foreground leading-relaxed">
              Tapping SOS will request GPS coordinates, format a Google Maps location link, open WhatsApp to your registered caregiver, and log the alert to your Caregiver Dashboard.
            </p>
          </div>

          {/* Registered Caregivers List / WhatsApp Dispatchers */}
          {caregivers.length > 0 && (
            <div className="w-full text-left space-y-2 pt-2 border-t">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Registered Caregivers ({caregivers.length})</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> Database Synced
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {caregivers.map((cg) => {
                  const googleMapsLink = coords
                    ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}`
                    : "Location unavailable";
                  const msg = `🚨 EMERGENCY SOS\n\nI need immediate assistance.\n\nMy current location:\n${googleMapsLink}\n\nPlease help me immediately.`;

                  return (
                    <div
                      key={cg.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 text-xs gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate flex items-center gap-1.5">
                          {cg.name}
                          {cg.is_primary && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground truncate">{cg.relation} · {cg.phone}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendWhatsAppSOS(cg, coords?.lat || 0, coords?.lon || 0, msg)}
                        className="gap-1.5 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 shrink-0 font-semibold"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 w-full pt-2">
            <Button onClick={shareLiveLocation} disabled={!coords} variant="outline" className="gap-2 text-xs">
              <Share2 className="h-4 w-4" /> Share Location Link
            </Button>
            {caregivers.length > 0 && (
              <a
                href={`tel:${caregivers[0].phone.replace(/[^0-9+]/g, "")}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Phone className="h-4 w-4" /> Call Caregiver
              </a>
            )}
            {triggered && (
              <Button variant="outline" onClick={cancelSOS} className="gap-2 text-xs text-destructive">
                <X className="h-4 w-4" /> Reset Alert
              </Button>
            )}
          </div>
        </div>

        {/* Live Map & GPS Coordinates Display */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-card relative">
            <div className="p-4 border-b flex items-center justify-between bg-card/80">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Live GPS Tracker
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${
                  locationStatus === "active"
                    ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                    : "border-amber-500 text-amber-600 bg-amber-50"
                }`}
              >
                {locationStatus === "active" ? "GPS Connected" : "Acquiring Position..."}
              </Badge>
            </div>

            {mapSrc ? (
              <iframe
                title="Live location map"
                src={mapSrc}
                className="h-80 w-full border-0"
                loading="lazy"
              />
            ) : (
              <div className="grid h-80 w-full place-items-center bg-muted text-muted-foreground">
                <div className="text-center p-4">
                  <MapPin className="mx-auto h-8 w-8 text-primary animate-bounce mb-2" />
                  <p className="text-sm font-medium">Acquiring current GPS location...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please allow location permissions in your browser.
                  </p>
                </div>
              </div>
            )}

            {coords && (
              <div className="p-4 border-t bg-card/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold">
                    Lat: {coords.lat.toFixed(5)}, Lon: {coords.lon.toFixed(5)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-bold ml-1"
                  >
                    Open Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {coords.updatedAt && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Updated: {coords.updatedAt}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

