import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  ShieldAlert,
  Siren,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  ListPlus,
  Trash2,
  ExternalLink,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/caregiver")({
  component: CaregiverPage,
});

export function CaregiverPage() {
  const [sosLogs, setSosLogs] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);

  // Form states for creating custom card
  const [newTitle, setNewTitle] = useState("");
  const [newPhraseEn, setNewPhraseEn] = useState("");
  const [newPhraseTa, setNewPhraseTa] = useState("");
  const [newPhraseHi, setNewPhraseHi] = useState("");
  const [newCategory, setNewCategory] = useState("Needs");

  // Form states for registering caregiver
  const [cgName, setCgName] = useState("");
  const [cgRelation, setCgRelation] = useState("Primary Caregiver");
  const [cgPhone, setCgPhone] = useState("");

  useEffect(() => {
    fetchCaregiverData();
  }, []);

  const fetchCaregiverData = async () => {
    try {
      const [logsRes, cardsRes, cgRes] = await Promise.all([
        fetch("http://localhost:8000/api/emergency/logs"),
        fetch("http://localhost:8000/api/communication/cards"),
        fetch("http://localhost:8000/api/caregivers"),
      ]);

      if (logsRes.ok) setSosLogs(await logsRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
      if (cgRes.ok) setCaregivers(await cgRes.json());
    } catch {
      // Fallback empty
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPhraseEn.trim()) {
      toast.error("Please fill in card title and English phrase");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/communication/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          phrase: newPhraseEn,
          spoken_phrase: newPhraseEn,
          category: newCategory,
          category_id: newCategory,
          icon: "MessageSquare",
          translations: {
            en: newPhraseEn,
            ta: newPhraseTa,
            hi: newPhraseHi,
          },
          phrases: {
            en: newPhraseEn,
            ta: newPhraseTa,
            hi: newPhraseHi,
          },
        }),
      });

      if (res.ok) {
        toast.success(`Multilingual card "${newTitle}" saved under category "${newCategory}"!`);
        setNewTitle("");
        setNewPhraseEn("");
        setNewPhraseTa("");
        setNewPhraseHi("");
        fetchCaregiverData();
      } else {
        toast.error("Failed to create card");
      }
    } catch {
      toast.error("Network error while creating card");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/communication/cards/${cardId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Custom card deleted");
        fetchCaregiverData();
      }
    } catch {
      toast.error("Failed to delete card");
    }
  };

  const handleAddCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cgName.trim() || !cgPhone.trim()) {
      toast.error("Please provide caregiver name and phone number");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/caregivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cgName,
          relation: cgRelation,
          phone: cgPhone,
          is_primary: caregivers.length === 0,
        }),
      });

      if (res.ok) {
        toast.success(`Caregiver "${cgName}" registered successfully!`);
        setCgName("");
        setCgPhone("");
        fetchCaregiverData();
      } else {
        toast.error("Failed to add caregiver");
      }
    } catch {
      toast.error("Network error adding caregiver");
    }
  };

  const handleDeleteCaregiver = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/caregivers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Caregiver removed");
        fetchCaregiverData();
      }
    } catch {
      toast.error("Failed to remove caregiver");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Caregiver Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage registered emergency caregivers, AAC communication cards, and monitor emergency SOS alert history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Register Caregiver & Add Custom Card */}
        <div className="space-y-6 lg:col-span-1">
          {/* Register Caregiver Form */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Register Caregiver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCaregiver} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cg-name">Caregiver Full Name</Label>
                  <Input
                    id="cg-name"
                    placeholder="e.g. Sarah Johnson"
                    value={cgName}
                    onChange={(e) => setCgName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cg-relation">Relationship</Label>
                  <Input
                    id="cg-relation"
                    placeholder="e.g. Sister, Doctor, Guardian"
                    value={cgRelation}
                    onChange={(e) => setCgRelation(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cg-phone">WhatsApp Phone Number</Label>
                  <Input
                    id="cg-phone"
                    placeholder="e.g. +15550102233"
                    value={cgPhone}
                    onChange={(e) => setCgPhone(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Include country code for WhatsApp click-to-chat dispatching.
                  </p>
                </div>

                <Button type="submit" className="w-full gap-2 gradient-primary">
                  <Plus className="h-4 w-4" />
                  Save Caregiver
                </Button>
              </form>

              {/* Registered List */}
              {caregivers.length > 0 && (
                <div className="mt-6 pt-4 border-t space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Registered ({caregivers.length})
                  </div>
                  <div className="space-y-2">
                    {caregivers.map((cg) => (
                      <div key={cg.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/40 text-xs">
                        <div>
                          <div className="font-bold flex items-center gap-1">
                            {cg.name}
                            {cg.is_primary && <Badge className="text-[9px] py-0">Primary</Badge>}
                          </div>
                          <div className="text-muted-foreground">{cg.relation} · {cg.phone}</div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteCaregiver(cg.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Custom Communication Card Form */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ListPlus className="h-5 w-5 text-primary" />
                Add Custom Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCard} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Card Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Juice, Glasses, Pain Relief"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Needs">Needs</SelectItem>
                      <SelectItem value="Emotions">Emotions</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Feelings">Feelings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phrase-en" className="flex items-center gap-1.5 font-medium">
                    <span>🇬🇧</span> English Phrase <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phrase-en"
                    placeholder="e.g. I want water"
                    value={newPhraseEn}
                    onChange={(e) => setNewPhraseEn(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phrase-ta" className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <span>🇮🇳</span> Tamil Phrase <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="phrase-ta"
                    placeholder="e.g. எனக்கு தண்ணீர் வேண்டும்"
                    value={newPhraseTa}
                    onChange={(e) => setNewPhraseTa(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phrase-hi" className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <span>🇮🇳</span> Hindi Phrase <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="phrase-hi"
                    placeholder="e.g. मुझे पानी चाहिए"
                    value={newPhraseHi}
                    onChange={(e) => setNewPhraseHi(e.target.value)}
                  />
                </div>

                <Button type="submit" variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Save Custom Card
                </Button>
              </form>

              {/* Saved Cards List */}
              {cards.length > 0 && (
                <div className="mt-6 pt-4 border-t space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Custom Board Cards ({cards.length})
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cards.map((c) => {
                      const t = c.translations || c.phrases || {};
                      const enText = t.en || c.phrase || c.spoken_phrase;
                      const taText = t.ta;
                      const hiText = t.hi;
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-card text-xs">
                          <div className="min-w-0 pr-2 space-y-0.5">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              {c.title}
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/30 text-primary">
                                {c.category || c.category_id || "Needs"}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground truncate text-[11px]">
                              🇬🇧 {enText || "N/A"}
                            </div>
                            {(taText || hiText) && (
                              <div className="text-muted-foreground/80 truncate text-[10px] flex items-center gap-2">
                                {taText && <span>🇮🇳 TA: {taText}</span>}
                                {hiText && <span>🇮🇳 HI: {hiText}</span>}
                              </div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteCard(c.id)}
                            className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Emergency SOS Alert History */}
        <Card className="lg:col-span-2 border shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Siren className="h-5 w-5 text-destructive" />
                Emergency SOS Alert History
              </div>
              <Badge variant="outline" className="text-xs">
                {sosLogs.length} Alerts Logged
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sosLogs.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No recent SOS emergency alerts logged.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sosLogs.map((log, i) => {
                  const lat = log.location?.latitude || 0;
                  const lng = log.location?.longitude || 0;
                  const mapsUrl = log.google_maps_link || `https://www.google.com/maps?q=${lat},${lng}`;

                  return (
                    <div
                      key={i}
                      className="flex flex-col space-y-3 p-4 rounded-2xl border bg-card shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-xl bg-destructive/10 text-destructive font-bold">
                            <ShieldAlert className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-destructive">🚨 Emergency SOS</div>
                            <div className="text-xs text-muted-foreground">User: {log.user_id || "Alex Rivera"}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-destructive/40 text-destructive bg-destructive/5 font-semibold">
                            Status: {log.status || "Active"}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 leading-relaxed bg-muted/30 p-3 rounded-xl">
                        <div className="font-semibold text-foreground whitespace-pre-wrap">
                          {log.message || "User needs immediate assistance"}
                        </div>
                        {log.caregiver_name && (
                          <div className="text-muted-foreground font-medium pt-1">
                            Dispatched to Caregiver: <span className="text-foreground font-bold">{log.caregiver_name}</span> ({log.caregiver_phone || "N/A"})
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {new Date(log.timestamp).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
                          </span>
                        </div>

                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          View Google Maps <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

