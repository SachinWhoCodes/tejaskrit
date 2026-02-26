import { useState } from "react";
import { Plus, Pin, Send, Clock, Users, Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { announcementsData, branches, batches } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function Announcements() {
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Communicate with students across drives</p>
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {/* Pinned Banner */}
      {announcementsData.filter(a => a.pinned).map((a) => (
        <div key={a.id} className="bg-primary/5 border border-primary/15 rounded-xl p-5 flex items-start gap-3">
          <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-1">Pinned · {a.target} · {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <StatusBadge status="Active" />
        </div>
      ))}

      {/* Announcements List */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {["Title", "Target", "Sent On", "Delivered", "Opened", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {announcementsData.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin className="w-3 h-3 text-primary" />}
                      <span className="text-sm font-medium text-foreground">{a.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge variant="secondary" className="text-xs">{a.target}</Badge></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {a.delivered}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <MailOpen className="w-3.5 h-3.5 text-muted-foreground" /> {a.opened}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Announcement title..." />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea placeholder="Write your announcement..." className="min-h-[120px]" />
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="branch">By Branch/Batch</SelectItem>
                  <SelectItem value="drive">Specific Drive Applicants</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="pin" />
              <label htmlFor="pin" className="text-sm text-foreground cursor-pointer">Pin this announcement</label>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm">
                <Clock className="w-4 h-4 mr-1.5" /> Schedule Later
              </Button>
              <Button size="sm">
                <Send className="w-4 h-4 mr-1.5" /> Send Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
