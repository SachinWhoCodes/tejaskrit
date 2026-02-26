import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Upload,
  Search,
  Filter,
  ChevronRight,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { branches, batches } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/auth/AuthProvider";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

const steps = ["Job Details", "Eligibility", "Dates", "Publish"];

type DriveDoc = {
  instituteId: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;

  title: string;
  company: string;
  location?: string | null;
  jobType?: "full-time" | "intern" | "contract" | string;
  ctcOrStipend?: string | null;
  applyUrl?: string | null;
  jdText?: string | null;

  verified: boolean;
  status: "Active" | "Closed";

  eligibility: {
    branches: string[];
    batch?: string | null;
    minCgpa?: number | null;
    skills?: string[];
    seatLimit?: number | null;
  };

  deadlineAt: Timestamp;
  oaAt?: Timestamp | null;
  interviewStartAt?: Timestamp | null;
  interviewEndAt?: Timestamp | null;

  stats?: {
    eligibleEstimate?: number;
    applicants?: number;
  };
};

type Drive = DriveDoc & { id: string };

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDate(ts?: Timestamp | null) {
  if (!ts) return null;
  return ts.toDate();
}

function isDeadlineSoon(deadline: Date | null) {
  if (!deadline) return false;
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

export default function DrivesJobs() {
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const instituteId = profile?.instituteId ?? null;

  const [searchText, setSearchText] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    jobType: "" as "" | "full-time" | "intern" | "contract",
    ctcOrStipend: "",
    applyUrl: "",
    jdText: "",

    eligibleBranches: [] as string[],
    batch: "",
    minCgpa: "",
    skillsCsv: "",
    seatLimit: "",

    deadlineLocal: "",
    oaLocal: "",
    interviewStart: "",
    interviewEnd: "",
  });

  // Realtime drives list for this institute
  useEffect(() => {
    if (!instituteId) return;

    setLoading(true);

    const q = query(
      collection(db, "drives"),
      where("instituteId", "==", instituteId),
      orderBy("deadlineAt", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Drive[] = snap.docs.map((d) => {
          const data = d.data() as DriveDoc;
          return { id: d.id, ...data };
        });
        setDrives(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        toast({
          title: "Failed to load drives",
          description: err?.message ?? "Check Firestore and network.",
          variant: "destructive",
        });
      },
    );

    return () => unsub();
  }, [instituteId, toast]);

  const filtered = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    if (!s) return drives;
    return drives.filter(
      (d) =>
        d.title.toLowerCase().includes(s) ||
        d.company.toLowerCase().includes(s),
    );
  }, [drives, searchText]);

  const selectedDrive = useMemo(() => {
    return selectedDriveId
      ? (drives.find((d) => d.id === selectedDriveId) ?? null)
      : null;
  }, [selectedDriveId, drives]);

  const estimatedEligible = useMemo(() => {
    // demo estimate: base 180 per branch
    const base = 180;
    const multiplier = Math.max(1, form.eligibleBranches.length);
    return base * multiplier;
  }, [form.eligibleBranches.length]);

  const resetWizard = () => {
    setCurrentStep(0);
    setForm({
      title: "",
      company: "",
      location: "",
      jobType: "",
      ctcOrStipend: "",
      applyUrl: "",
      jdText: "",

      eligibleBranches: [],
      batch: "",
      minCgpa: "",
      skillsCsv: "",
      seatLimit: "",

      deadlineLocal: "",
      oaLocal: "",
      interviewStart: "",
      interviewEnd: "",
    });
  };

  const toggleBranch = (b: string, checked: boolean) => {
    setForm((p) => {
      const set = new Set(p.eligibleBranches);
      if (checked) set.add(b);
      else set.delete(b);
      return { ...p, eligibleBranches: Array.from(set) };
    });
  };

  const publishDrive = async () => {
    if (!user || !instituteId) {
      toast({
        title: "Not ready",
        description: "Login and register your institute first.",
        variant: "destructive",
      });
      return;
    }

    if (!form.title.trim()) {
      toast({ title: "Role title required", variant: "destructive" });
      return;
    }
    if (!form.company.trim()) {
      toast({ title: "Company required", variant: "destructive" });
      return;
    }
    if (!form.deadlineLocal) {
      toast({ title: "Deadline required", variant: "destructive" });
      return;
    }

    const deadlineDate = new Date(form.deadlineLocal);
    if (Number.isNaN(deadlineDate.getTime())) {
      toast({ title: "Invalid deadline date", variant: "destructive" });
      return;
    }

    const minCgpaNum =
      form.minCgpa.trim() === "" ? null : Number.parseFloat(form.minCgpa);
    const seatLimitNum =
      form.seatLimit.trim() === "" ? null : Number.parseInt(form.seatLimit, 10);

    const skills =
      form.skillsCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    const oaAt = form.oaLocal
      ? Timestamp.fromDate(new Date(form.oaLocal))
      : null;
    const interviewStartAt = form.interviewStart
      ? Timestamp.fromDate(new Date(form.interviewStart))
      : null;
    const interviewEndAt = form.interviewEnd
      ? Timestamp.fromDate(new Date(form.interviewEnd))
      : null;

    const payload: DriveDoc = {
      instituteId,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim() || null,
      jobType: form.jobType || "intern",
      ctcOrStipend: form.ctcOrStipend.trim() || null,
      applyUrl: form.applyUrl.trim() || null,
      jdText: form.jdText.trim() || null,

      verified: true,
      status: "Active",

      eligibility: {
        branches: form.eligibleBranches,
        batch: form.batch || null,
        minCgpa: minCgpaNum,
        skills,
        seatLimit: seatLimitNum,
      },

      deadlineAt: Timestamp.fromDate(deadlineDate),
      oaAt,
      interviewStartAt,
      interviewEndAt,

      stats: {
        eligibleEstimate: estimatedEligible,
        applicants: 0,
      },
    };

    setSaving(true);
    try {
      await addDoc(collection(db, "drives"), payload);
      toast({
        title: "Drive published",
        description: "Saved to Firestore (Institute Verified).",
      });
      setWizardOpen(false);
      resetWizard();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Publish failed",
        description: err?.message ?? "Check Firestore settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const nextOrPublish = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
      return;
    }
    await publishDrive();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drives & Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institute-verified campus placements (Firestore)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast({
                title: "Import Job",
                description: "Coming soon (UI ready).",
              })
            }
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import Job
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetWizard();
              setWizardOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create New Drive
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search drives..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast({ title: "Filters", description: "Coming soon." })
          }
        >
          <Filter className="w-4 h-4 mr-1.5" /> Filters
        </Button>
      </div>

      {/* Drives Table */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Title
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Company
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Deadline
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Eligible
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Applicants
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Status
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3.5">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading drives…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10">
                    <div className="text-center text-sm text-muted-foreground">
                      No drives found. Create your first institute verified
                      drive.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((d) => {
                  const deadline = toDate(d.deadlineAt);
                  const status =
                    d.status === "Closed"
                      ? "Closed"
                      : isDeadlineSoon(deadline)
                        ? "Deadline Soon"
                        : "Active";

                  return (
                    <tr
                      key={d.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {d.title}
                          </span>
                          {d.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-foreground">
                        {d.company}
                      </td>

                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {formatDate(deadline)}
                      </td>

                      <td className="px-5 py-4 text-sm text-center text-foreground">
                        {d.stats?.eligibleEstimate ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-center text-foreground">
                        {d.stats?.applicants ?? 0}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={status} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDriveId(d.id)}
                        >
                          View <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Drive Wizard */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Drive</DialogTitle>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>

                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i <= currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {s}
                </span>

                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded ${
                      i < currentStep ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 0 */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role Title</Label>
                  <Input
                    placeholder="e.g. SDE Intern"
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    placeholder="e.g. Google"
                    value={form.company}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, company: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Bangalore / Remote"
                    value={form.location}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, location: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select
                    value={form.jobType}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, jobType: v as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="intern">Internship</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTC / Stipend</Label>
                  <Input
                    placeholder="e.g. ₹12 LPA or ₹40k/month"
                    value={form.ctcOrStipend}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ctcOrStipend: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apply Link</Label>
                  <Input
                    placeholder="https://..."
                    value={form.applyUrl}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, applyUrl: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea
                  placeholder="Describe responsibilities and requirements..."
                  className="min-h-[120px]"
                  value={form.jdText}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, jdText: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Eligible Branches</Label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => {
                    const checked = form.eligibleBranches.includes(b);
                    return (
                      <label
                        key={b}
                        className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm cursor-pointer hover:bg-secondary transition-colors"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleBranch(b, Boolean(v))}
                        />
                        {b}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch / Year</Label>
                  <Select
                    value={form.batch}
                    onValueChange={(v) => setForm((p) => ({ ...p, batch: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Min CGPA</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 7.0"
                    value={form.minCgpa}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, minCgpa: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Required Skills</Label>
                <Input
                  placeholder="e.g. Python, SQL, React (comma separated)"
                  value={form.skillsCsv}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, skillsCsv: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Seat Limit (optional)</Label>
                <Input
                  type="number"
                  placeholder="Leave blank for unlimited"
                  value={form.seatLimit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, seatLimit: e.target.value }))
                  }
                />
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  Estimated eligible students:{" "}
                  <span className="font-semibold text-foreground">
                    ~{estimatedEligible}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application Deadline</Label>
                <Input
                  type="datetime-local"
                  value={form.deadlineLocal}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, deadlineLocal: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Online Assessment Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.oaLocal}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, oaLocal: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interview Start Date (optional)</Label>
                  <Input
                    type="date"
                    value={form.interviewStart}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, interviewStart: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interview End Date (optional)</Label>
                  <Input
                    type="date"
                    value={form.interviewEnd}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, interviewEnd: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Institute Verified
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This drive is verified by the placement cell
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Enabled
                  </span>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Review Summary
                </p>
                <p className="text-xs text-muted-foreground">
                  Role: {form.title || "—"} — {form.company || "—"} —{" "}
                  {form.location || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Eligible:{" "}
                  {form.eligibleBranches.length
                    ? form.eligibleBranches.join(", ")
                    : "All"}{" "}
                  — Batch {form.batch || "—"} — Min CGPA {form.minCgpa || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Deadline:{" "}
                  {form.deadlineLocal
                    ? formatDate(new Date(form.deadlineLocal))
                    : "—"}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() =>
                currentStep > 0
                  ? setCurrentStep(currentStep - 1)
                  : setWizardOpen(false)
              }
              disabled={saving}
            >
              {currentStep > 0 ? "Back" : "Cancel"}
            </Button>

            <Button onClick={nextOrPublish} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…
                </>
              ) : currentStep < steps.length - 1 ? (
                "Next"
              ) : (
                "Publish Drive"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drive Detail Slide-over */}
      {selectedDrive && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setSelectedDriveId(null)}
          />
          <div className="relative w-full max-w-xl bg-card border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedDrive.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedDrive.company}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDriveId(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  status={
                    selectedDrive.status === "Closed"
                      ? "Closed"
                      : isDeadlineSoon(toDate(selectedDrive.deadlineAt))
                        ? "Deadline Soon"
                        : "Active"
                  }
                />
                {selectedDrive.verified && (
                  <StatusBadge status="Institute Verified" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    Eligible Students
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedDrive.stats?.eligibleEstimate ?? "—"}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Applicants</p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedDrive.stats?.applicants ?? 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Eligibility</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedDrive.eligibility?.branches?.length
                    ? selectedDrive.eligibility.branches
                    : ["All Branches"]
                  ).map((b) => (
                    <Badge key={b} variant="secondary" className="text-xs">
                      {b}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="text-xs">
                    Batch {selectedDrive.eligibility?.batch ?? "—"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Min CGPA {selectedDrive.eligibility?.minCgpa ?? "—"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Important dates</p>
                <div className="text-sm text-foreground space-y-1">
                  <p>
                    <span className="text-muted-foreground">Deadline:</span>{" "}
                    {formatDate(toDate(selectedDrive.deadlineAt))}
                  </p>
                  <p>
                    <span className="text-muted-foreground">OA:</span>{" "}
                    {formatDate(toDate(selectedDrive.oaAt ?? null))}
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Interview window:
                    </span>{" "}
                    {formatDate(toDate(selectedDrive.interviewStartAt ?? null))}{" "}
                    — {formatDate(toDate(selectedDrive.interviewEndAt ?? null))}
                  </p>
                </div>
              </div>

              {selectedDrive.applyUrl && (
                <Button asChild variant="outline" className="w-full">
                  <a
                    href={selectedDrive.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Apply Link
                  </a>
                </Button>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Created by: {selectedDrive.createdBy}</p>
                <p>Institute: {selectedDrive.instituteId}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
