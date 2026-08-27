import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  User,
  Plus,
  Trash2,
  Edit3,
  Camera,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { API_BASE } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({
    meta: [
      { title: "My Profile — SignConnect" },
      { name: "description", content: "Manage your personal information and registered caregiver." },
    ],
  }),
});

interface Caregiver {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email?: string;
  is_primary?: boolean;
}

interface UserProfileData {
  fullName: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  photoUrl: string;
}

const STORAGE_KEY = "signconnect_user_profile";

const DEFAULT_PROFILE: UserProfileData = {
  fullName: "Janani",
  age: "20",
  gender: "Female",
  phone: "+91 98765 43210",
  email: "janani@example.com",
  address: "123 Green Avenue, Chennai, Tamil Nadu",
  photoUrl: "",
};

function Profile() {
  // Personal Profile Form States
  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);

  // Caregivers State
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  // Edit Caregiver Modal States
  const [editingCaregiver, setEditingCaregiver] = useState<Caregiver | null>(null);
  const [editName, setEditName] = useState("");
  const [editRelation, setEditRelation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  // File Input Ref for Photo Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved profile data and caregivers on mount
  useEffect(() => {
    // Load local storage profile if exists
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProfile((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      /* fallback to defaults */
    }

    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    try {
      const res = await fetch("https://hearme-2-uvm0.onrender.com/api/caregivers");
      if (res.ok) {
        const data = await res.json();
        setCaregivers(Array.isArray(data) ? data : []);
      }
    } catch {
      // Fallback sample caregiver if server offline
      setCaregivers([
        {
          id: "cg_1",
          name: "Sarah Johnson",
          relation: "Primary Caregiver",
          phone: "+91 98765 12345",
          is_primary: true,
        },
      ]);
    }
  };

  // Profile Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const updated = { ...profile, photoUrl: result };
      setProfile(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* storage full or unavailable */
      }
      toast.success("Profile picture updated successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Save Profile Handler with Input Validation
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!profile.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    const numericAge = Number(profile.age);
    if (!profile.age.trim() || isNaN(numericAge) || numericAge <= 0 || numericAge > 120) {
      toast.error("Please enter a valid numeric age (1-120)");
      return;
    }

    if (!profile.gender) {
      toast.error("Please select a gender");
      return;
    }

    if (!profile.phone.trim() || profile.phone.trim().length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!profile.email.trim() || !emailRegex.test(profile.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      toast.success("Profile saved successfully!");
    } catch {
      toast.error("Failed to save profile locally");
    }
  };

  // Remove Caregiver Handler
  const handleRemoveCaregiver = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/caregivers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Caregiver "${name}" removed`);
        fetchCaregivers();
      } else {
        // Fallback local remove
        setCaregivers((prev) => prev.filter((c) => c.id !== id));
        toast.success(`Caregiver "${name}" removed`);
      }
    } catch {
      setCaregivers((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Caregiver "${name}" removed`);
    }
  };

  // Open Edit Caregiver Dialog
  const handleOpenEdit = (caregiver: Caregiver) => {
    setEditingCaregiver(caregiver);
    setEditName(caregiver.name);
    setEditRelation(caregiver.relation || "Caregiver");
    setEditPhone(caregiver.phone);
    setIsEditOpen(true);
  };

  // Save Edited Caregiver Handler
  const handleSaveEditCaregiver = async () => {
    if (!editingCaregiver) return;
    if (!editName.trim() || !editPhone.trim()) {
      toast.error("Please fill in caregiver name and phone number");
      return;
    }

    try {
      const updatedPayload = {
        id: editingCaregiver.id,
        name: editName,
        relation: editRelation,
        phone: editPhone,
        is_primary: editingCaregiver.is_primary ?? false,
      };

      const res = await fetch(`${API_BASE}/api/caregivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });

      if (res.ok) {
        toast.success(`Caregiver "${editName}" updated successfully`);
        setIsEditOpen(false);
        fetchCaregivers();
      } else {
        // Local state fallback
        setCaregivers((prev) =>
          prev.map((c) => (c.id === editingCaregiver.id ? { ...c, ...updatedPayload } : c))
        );
        toast.success(`Caregiver "${editName}" updated`);
        setIsEditOpen(false);
      }
    } catch {
      setCaregivers((prev) =>
        prev.map((c) =>
          c.id === editingCaregiver.id
            ? { ...c, name: editName, relation: editRelation, phone: editPhone }
            : c
        )
      );
      toast.success(`Caregiver "${editName}" updated`);
      setIsEditOpen(false);
    }
  };

  // Compute initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name.trim()) return "U";
    return name
      .trim()
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* PAGE HEADER */}
      <PageHeader
        icon={<User className="h-6 w-6" />}
        title="My Profile"
        description="Manage your personal information and registered caregiver."
      />

      <div className="space-y-8">
        {/* SECTION 1 — PERSONAL INFORMATION CARD */}
        <Card className="rounded-3xl border bg-card/80 backdrop-blur shadow-card">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your personal profile details used across SignConnect services.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Photo Area */}
              <div className="flex flex-col items-center justify-center text-center pb-4 border-b">
                <Avatar className="h-28 w-28 shadow-glow border-2 border-primary/30">
                  <AvatarImage src={profile.photoUrl} alt={profile.fullName} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {getInitials(profile.fullName)}
                  </AvatarFallback>
                </Avatar>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2 rounded-full hover:border-primary hover:text-primary transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Change Photo
                </Button>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="font-semibold text-sm">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="full-name"
                      placeholder="Enter your name"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className="pl-9"
                    />
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-2">
                  <Label htmlFor="age" className="font-semibold text-sm">
                    Age <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter age"
                      min="1"
                      max="120"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                      className="pl-9"
                    />
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="font-semibold text-sm">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(val) => setProfile({ ...profile, gender: val })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-semibold text-sm">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="pl-9"
                    />
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="font-semibold text-sm">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="pl-9"
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Address (Optional) */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address" className="font-semibold text-sm">
                    Address <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="address"
                      placeholder="Enter address"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="pl-9"
                    />
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Save Profile Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full sm:w-auto gradient-primary text-primary-foreground font-semibold px-8 py-2.5 rounded-full shadow-glow"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* SECTION 2 — REGISTERED CAREGIVERS CARD */}
        <Card className="rounded-3xl border bg-card/80 backdrop-blur shadow-card">
          <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Registered Caregivers
              </CardTitle>
              <CardDescription className="mt-1">
                People who can assist you when you need help.
              </CardDescription>
            </div>
            {/* [+ Add Caregiver] Button navigating to Caregiver Page */}
            <Link to="/caregiver">
              <Button
                size="sm"
                className="gradient-primary text-primary-foreground font-medium rounded-full gap-1.5 shadow-sm shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Caregiver
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            {caregivers.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted mx-auto text-muted-foreground">
                  <UserCheck className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No registered caregivers found. Click below to add a caregiver.
                </p>
                <Link to="/caregiver">
                  <Button variant="outline" size="sm" className="mt-2 rounded-full gap-1.5">
                    <Plus className="h-4 w-4" /> Add Caregiver
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {caregivers.map((cg) => (
                  <div
                    key={cg.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-muted/30 hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base truncate">{cg.name}</h4>
                          {cg.is_primary && (
                            <Badge className="text-[10px] py-0.5 px-2 gradient-primary text-primary-foreground font-semibold">
                              Primary
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px] font-medium"
                          >
                            ● Registered
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                          <span>{cg.relation || "Caregiver"}</span>
                          <span>•</span>
                          <span className="font-mono text-foreground/80">📱 {cg.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: [ Edit ] [ Remove ] */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(cg)}
                        className="h-8 gap-1.5 rounded-lg text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCaregiver(cg.id, cg.name)}
                        className="h-8 gap-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EDIT CAREGIVER DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Caregiver
            </DialogTitle>
            <DialogDescription>
              Update caregiver details and phone number for WhatsApp alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cg-name">Caregiver Name</Label>
              <Input
                id="edit-cg-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-cg-relation">Relationship</Label>
              <Input
                id="edit-cg-relation"
                value={editRelation}
                onChange={(e) => setEditRelation(e.target.value)}
                placeholder="e.g. Primary Caregiver, Doctor, Sister"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-cg-phone">WhatsApp Phone Number</Label>
              <Input
                id="edit-cg-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. +91 98765 12345"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditCaregiver} className="gradient-primary text-primary-foreground">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
