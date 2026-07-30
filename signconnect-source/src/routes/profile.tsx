import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Plus, Trash2, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EMERGENCY_CONTACTS, CONVERSATION_HISTORY } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({
    meta: [
      { title: "Profile — SignConnect" },
      { name: "description", content: "Manage your name, language preferences, emergency contacts and communication history." },
    ],
  }),
});

function Profile() {
  const [name, setName] = useState("Alex Rivera");
  const [language, setLanguage] = useState("American Sign Language (ASL)");
  const [contacts, setContacts] = useState(EMERGENCY_CONTACTS);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setContacts((c) => [
      ...c,
      { id: crypto.randomUUID(), name: newContact.name, relation: "Contact", phone: newContact.phone },
    ]);
    setNewContact({ name: "", phone: "" });
    toast.success("Contact added");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<User className="h-6 w-6" />}
        eyebrow="Account"
        title="Your profile"
        description="Personalize SignConnect and manage your safety contacts."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 shadow-glow">
              <AvatarImage src="https://api.dicebear.com/7.x/adventurer/svg?seed=Alex" />
              <AvatarFallback>AR</AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold">{name}</h2>
            <p className="text-sm text-muted-foreground">{language}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.info("Photo upload coming soon")}>
              Change photo
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Preferred sign language</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5" />
            </div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={() => toast.success("Profile saved")}>
              Save changes
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h3 className="mb-3 font-semibold">Emergency contacts</h3>
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.relation} · {c.phone}</div>
                  </div>
                  <button
                    onClick={() => setContacts((cs) => cs.filter((x) => x.id !== c.id))}
                    aria-label={`Remove ${c.name}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact((n) => ({ ...n, name: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact((n) => ({ ...n, phone: e.target.value }))}
              />
              <Button onClick={addContact} className="gradient-primary text-primary-foreground">
                <Plus /> Add
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h3 className="mb-3 font-semibold">Communication history</h3>
            <ul className="divide-y">
              {CONVERSATION_HISTORY.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <MessagesSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{h.summary}</div>
                      <div className="text-xs text-muted-foreground">{h.date} · {h.messages} messages</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Open</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
