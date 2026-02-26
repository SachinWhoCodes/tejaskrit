import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pin,
  Send,
  Clock,
  Mail,
  MailOpen,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/auth/AuthProvider";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";

type AnnouncementDoc = {
  instituteId: string;
  createdBy: string;
  createdAt?: any;

  title: string;
  message: string;

  targetType: "all" | "branch" | "drive" | "custom";
  targetLabel: string;

  pinned: boolean;

  delivered: number;
  opened: number;

  scheduledAt?: Timestamp | null;
};

type Announcement = AnnouncementDoc & { id: string };

function formatDate(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Announcements() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [composeOpen, setComposeOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Announcement[]>([]);
  const [sending, setSending] = useState(false);

  // compose form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] =
    useState<AnnouncementDoc["targetType"]>("all");
  const [targetLabel, setTargetLabel] = useState("All Students");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!instituteId) return;

    setLoading(true);
    const q = query(
      collection(db, "announcements"),
      where("instituteId", "==", instituteId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as AnnouncementDoc),
        }));
        // sort latest first without Firestore orderBy (avoids composite index)
        list.sort((a, b) => {
          const ams = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
          const bms = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
          return bms - ams;
        });
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        toast({
          title: "Failed to load announcements",
          description: err?.message ?? "Check Firestore / network.",
          variant: "destructive",
        });
      },
    );

    return () => unsub();
  }, [instituteId, toast]);

  const pinnedOnes = useMemo(() => rows.filter((a) => a.pinned), [rows]);
  const viewItem = useMemo(
    () => (viewId ? (rows.find((r) => r.id === viewId) ?? null) : null),
    [viewId, rows],
  );

  const resetCompose = () => {
    setTitle("");
    setMessage("");
    setTargetType("all");
    setTargetLabel("All Students");
    setPinned(false);
  };

  const sendNow = async () => {
    if (!user || !instituteId) return;

    if (!title.trim())
      return toast({ title: "Title required", variant: "destructive" });
    if (!message.trim())
      return toast({ title: "Message required", variant: "destructive" });

    setSending(true);
    try {
      const payload: AnnouncementDoc = {
        instituteId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),

        title: title.trim(),
        message: message.trim(),

        targetType,
        targetLabel:
          targetType === "all"
            ? "All Students"
            : targetLabel.trim() || "Targeted",

        pinned,

        // demo metrics (still useful for UI)
        delivered: targetType === "all" ? 500 : 120,
        opened: targetType === "all" ? 320 : 75,

        scheduledAt: null,
      };

      await addDoc(collection(db, "announcements"), payload);
      toast({ title: "Announcement sent", description: "Saved to Firestore." });

      setComposeOpen(false);
      resetCompose();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Send failed",
        description: e?.message ?? "Could not send announcement.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const togglePinned = async (a: Announcement) => {
    try {
      await updateDoc(doc(db, "announcements", a.id), { pinned: !a.pinned });
      toast({ title: a.pinned ? "Unpinned" : "Pinned" });
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message ?? "Could not update.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Communicate with students across drives
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetCompose();
            setComposeOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {/* Pinned Banner */}
      {pinnedOnes.map((a) => (
        <div
          key={a.id}
          className="bg-primary/5 border border-primary/15 rounded-xl p-5 flex items-start gap-3"
        >
          <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pinned · {a.targetLabel} · {formatDate(a.createdAt?.toDate?.())}
            </p>
          </div>
          <StatusBadge status="Active" />
        </div>
      ))}

      {/* List */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {["Title", "Target", "Sent On", "Delivered", "Opened", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading announcements…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10">
                    <div className="text-center text-sm text-muted-foreground">
                      No announcements yet. Create your first announcement.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {a.pinned && <Pin className="w-3 h-3 text-primary" />}
                        <span className="text-sm font-medium text-foreground">
                          {a.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="secondary" className="text-xs">
                        {a.targetLabel}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(a.createdAt?.toDate?.())}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                        {a.delivered}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <MailOpen className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                        {a.opened}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePinned(a)}
                      >
                        <Pin className="w-4 h-4 mr-1.5" />
                        {a.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewId(a.id)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compose */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your announcement..."
                className="min-h-[120px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                value={targetType}
                onValueChange={(v) => {
                  const t = v as AnnouncementDoc["targetType"];
                  setTargetType(t);
                  setTargetLabel(t === "all" ? "All Students" : "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="branch">By Branch/Batch</SelectItem>
                  <SelectItem value="drive">
                    Specific Drive Applicants
                  </SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType !== "all" && (
              <div className="space-y-2">
                <Label>Target label</Label>
                <Input
                  placeholder="e.g. CSE 2026 / Google SDE Applicants"
                  value={targetLabel}
                  onChange={(e) => setTargetLabel(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="pin"
                checked={pinned}
                onCheckedChange={(v) => setPinned(Boolean(v))}
              />
              <label
                htmlFor="pin"
                className="text-sm text-foreground cursor-pointer"
              >
                Pin this announcement
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Schedule Later",
                    description: "Hackathon MVP: send now.",
                  })
                }
                disabled={sending}
              >
                <Clock className="w-4 h-4 mr-1.5" /> Schedule Later
              </Button>

              <Button size="sm" onClick={sendNow} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" /> Send Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Slide-over */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setViewId(null)}
          />
          <div className="relative w-full max-w-xl bg-card border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {viewItem.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewItem.targetLabel} ·{" "}
                  {formatDate(viewItem.createdAt?.toDate?.())}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {viewItem.pinned && (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                  <Pin className="w-3.5 h-3.5" /> Pinned
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {viewItem.message}
              </div>

              <div className="text-xs text-muted-foreground pt-4">
                Created by: {viewItem.createdBy}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
