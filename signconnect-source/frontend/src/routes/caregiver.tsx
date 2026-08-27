import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Plus,
  ListPlus,
  Trash2,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api-config";

export const Route = createFileRoute("/caregiver")({
  component: CaregiverPage,
});

function CaregiverPage() {
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
      const [cardsRes, cgRes] = await Promise.all([
        fetch(`${API_BASE}/api/communication/cards`),
        fetch(`${API_BASE}/api/caregivers`),
      ]);

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
      const res = await fetch(`${API_BASE}/api/communication/cards`, {
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
      const res = await fetch(`${API_BASE}/api/communication/cards/${cardId}`, {
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
      const res = await fetch(`${API_BASE}/api/caregivers`, {
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
      const res = await fetch(`${API_BASE}/api/caregivers/${id}`, {
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
          Manage registered caregivers and customize AAC communication cards.
        </p>
      </div>

      {/* SECTION 1 — FORM AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Register Caregiver Form */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Register Caregiver
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
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

              <Button type="submit" className="w-full gap-2 gradient-primary mt-2">
                <Plus className="h-4 w-4" />
                Save Caregiver
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add Custom Card Form */}
        <Card className="border shadow-sm flex flex-col justify-between">
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
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2 — SAVED DATA */}
      {/* REGISTERED CAREGIVERS (Full Width) */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            REGISTERED CAREGIVERS
          </CardTitle>
          <Badge variant="secondary" className="font-semibold text-xs">
            {caregivers.length} Registered
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {caregivers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No registered caregivers yet. Use the form above to add a caregiver.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {caregivers.map((cg) => (
                <div
                  key={cg.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-sm"
                >
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <div className="font-bold flex items-center gap-2">
                      {cg.name}
                      {cg.is_primary && (
                        <Badge className="text-[10px] py-0 px-2 gradient-primary">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground text-xs">{cg.relation || "Caregiver"}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs font-mono text-foreground/80">{cg.phone}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteCaregiver(cg.id)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                    title={`Delete ${cg.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CUSTOM BOARD CARDS (Full Width) */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-primary" />
            CUSTOM BOARD CARDS ({cards.length})
          </CardTitle>
          <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
            {cards.length} Cards Available
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No custom communication cards saved yet. Use the form above to create custom cards.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {cards.map((c) => {
                const t = c.translations || c.phrases || {};
                const enText = t.en || c.phrase || c.spoken_phrase;
                const taText = t.ta;
                const hiText = t.hi;
                const catName = c.category || c.category_id || "Needs";

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-sm gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-bold flex items-center gap-2 truncate">
                        <span>{c.title}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-2 border-primary/40 text-primary bg-primary/5 shrink-0"
                        >
                          {catName}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed flex flex-wrap items-center gap-3">
                        {enText && <span>🇬🇧 <strong>EN:</strong> {enText}</span>}
                        {taText && <span>🇮🇳 <strong>TA:</strong> {taText}</span>}
                        {hiText && <span>🇮🇳 <strong>HI:</strong> {hiText}</span>}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteCard(c.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                      title={`Delete ${c.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

