import { Building2, Users, Palette, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const members = [
  { name: "Dr. Sharma", role: "Admin", email: "sharma@nitt.edu" },
  { name: "Prof. Gupta", role: "Coordinator", email: "gupta@nitt.edu" },
  { name: "Ms. Priya", role: "Assistant", email: "priya@nitt.edu" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Institute profile & team management</p>
      </div>

      {/* Institute Profile */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Institute Profile</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Institute Name</Label>
            <Input defaultValue="National Institute of Technology, Trichy" />
          </div>
          <div className="space-y-2">
            <Label>Institute Code</Label>
            <Input defaultValue="NITT" disabled className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input defaultValue="placement@nitt.edu" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input defaultValue="+91 431 250 3000" />
          </div>
        </div>
        <Button size="sm">Save Changes</Button>
      </div>

      {/* TPO Members */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">TPO Members</h2>
          </div>
          <Button variant="outline" size="sm">Invite Member</Button>
        </div>
        <div className="space-y-2">
          {members.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{m.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">{m.role}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Branding */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Branding</h2>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
          <p>Platform: <span className="font-medium text-foreground">Tejaskrit</span></p>
          <p>Primary Color: <span className="inline-block w-3 h-3 rounded bg-primary align-middle mr-1" /> Deep Indigo</p>
          <p>Logo: Configured via platform settings</p>
        </div>
      </div>
    </div>
  );
}
