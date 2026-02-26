import { useEffect, useMemo, useState } from "react";
import { Search, X, StickyNote, Plus, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { branches, batches, placementStatuses } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type StudentDoc = {
  instituteId: string;
  createdAt?: any;
  updatedAt?: any;

  name: string;
  email?: string | null;
  rollNo?: string | null;

  branch: string;
  batch: string;
  cgpa: number;

  status: string; // Placed / In Process / Unplaced / Not Started
  notes?: string | null;
};

type Student = StudentDoc & { id: string };

type AppDoc = {
  instituteId: string;
  createdAt?: any;
  updatedAt?: any;

  studentId: string;
  studentName: string;

  company: string;
  role: string;

  status: string; // Applied/OA/Interview/Offer/Rejected/Joined
  appliedAt?: Timestamp | null;

  nextEventLabel?: string | null;
  nextEventAt?: Timestamp | null;

  outcome?: string | null;
};

type Application = AppDoc & { id: string };

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Students() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [apps, setApps] = useState<Application[]>([]);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  // Add student dialog
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    rollNo: "",
    branch: "CSE",
    batch: "2026",
    cgpa: "8.0",
    status: "Not Started",
    notes: "",
  });

  // Notes editing
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // realtime students
  useEffect(() => {
    if (!instituteId) return;

    setLoading(true);
    const q = query(
      collection(db, "students"),
      where("instituteId", "==", instituteId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Student[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as StudentDoc),
        }));

        // sort by name
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setStudents(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        toast({
          title: "Failed to load students",
          description: err?.message ?? "Check Firestore setup.",
          variant: "destructive",
        });
      },
    );

    return () => unsub();
  }, [instituteId, toast]);

  // realtime applications (only for counts + pipeline + upcoming)
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "applications"),
      where("instituteId", "==", instituteId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Application[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as AppDoc),
        }));
        setApps(list);
      },
      (err) => {
        console.error(err);
      },
    );

    return () => unsub();
  }, [instituteId]);

  const countsByStudent = useMemo(() => {
    const map = new Map<string, { applications: number; offers: number }>();
    for (const a of apps) {
      const key = a.studentId;
      const prev = map.get(key) ?? { applications: 0, offers: 0 };
      prev.applications += 1;
      if (a.status === "Offer" || a.status === "Joined") prev.offers += 1;
      map.set(key, prev);
    }
    return map;
  }, [apps]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return students.filter((st) => {
      const matchSearch = !s || st.name.toLowerCase().includes(s);
      const matchBranch = branchFilter === "all" || st.branch === branchFilter;
      const matchStatus = statusFilter === "all" || st.status === statusFilter;
      return matchSearch && matchBranch && matchStatus;
    });
  }, [students, search, branchFilter, statusFilter]);

  const student = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) ?? null;
  }, [selectedStudentId, students]);

  const studentApps = useMemo(() => {
    if (!student) return [];
    const list = apps.filter((a) => a.studentId === student.id);
    // sort by updatedAt or createdAt desc
    list.sort((a, b) => {
      const ams =
        a.updatedAt?.toDate?.()?.getTime?.() ??
        a.createdAt?.toDate?.()?.getTime?.() ??
        0;
      const bms =
        b.updatedAt?.toDate?.()?.getTime?.() ??
        b.createdAt?.toDate?.()?.getTime?.() ??
        0;
      return bms - ams;
    });
    return list;
  }, [apps, student]);

  const upcoming = useMemo(() => {
    if (!student) return [];
    const now = Date.now();
    return studentApps
      .filter((a) => a.nextEventAt?.toDate?.())
      .map((a) => ({
        id: a.id,
        label: a.nextEventLabel ?? "Next event",
        date: a.nextEventAt?.toDate?.() ?? null,
        company: a.company,
        role: a.role,
      }))
      .filter((e) => (e.date?.getTime?.() ?? 0) >= now)
      .sort((a, b) => (a.date?.getTime?.() ?? 0) - (b.date?.getTime?.() ?? 0))
      .slice(0, 6);
  }, [student, studentApps]);

  // keep notes draft in sync when panel opens
  useEffect(() => {
    if (!student) return;
    setNotesDraft(student.notes ?? "");
  }, [student?.id]);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      rollNo: "",
      branch: "CSE",
      batch: "2026",
      cgpa: "8.0",
      status: "Not Started",
      notes: "",
    });
  };

  const createStudent = async () => {
    if (!instituteId) return;

    const name = form.name.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }

    const cgpaNum = Number.parseFloat(form.cgpa);
    if (Number.isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      toast({ title: "Invalid CGPA (0–10)", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: StudentDoc = {
        instituteId,
        name,
        email: form.email.trim() || null,
        rollNo: form.rollNo.trim() || null,
        branch: form.branch,
        batch: form.batch,
        cgpa: cgpaNum,
        status: form.status,
        notes: form.notes.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "students"), payload);

      toast({ title: "Student added", description: "Saved to Firestore." });
      setAddOpen(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Failed to add student",
        description: e?.message ?? "Check Firestore setup.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!student) return;
    setNotesSaving(true);
    try {
      await updateDoc(doc(db, "students", student.id), {
        notes: notesDraft,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Notes saved" });
    } catch (e: any) {
      toast({
        title: "Failed to save notes",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setNotesSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Student directory & placement tracking (Firestore)
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setAddOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {placementStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {[
                  "Name",
                  "Branch",
                  "Batch",
                  "CGPA",
                  "Status",
                  "Applications",
                  "Offers",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading students…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10">
                    <div className="text-center text-sm text-muted-foreground">
                      No students found. Add your first student.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((s) => {
                  const counts = countsByStudent.get(s.id) ?? {
                    applications: 0,
                    offers: 0,
                  };

                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-foreground">
                        {s.name}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="secondary" className="text-xs">
                          {s.branch}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {s.batch}
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground font-medium">
                        {s.cgpa}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">
                        {counts.applications}
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">
                        {counts.offers}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStudentId(s.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Aarav Patel"
                />
              </div>
              <div className="space-y-2">
                <Label>Roll No (optional)</Label>
                <Input
                  value={form.rollNo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rollNo: e.target.value }))
                  }
                  placeholder="e.g. 2026CSE045"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="student@college.edu"
                />
              </div>
              <div className="space-y-2">
                <Label>CGPA</Label>
                <Input
                  value={form.cgpa}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cgpa: e.target.value }))
                  }
                  placeholder="8.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={form.branch}
                  onValueChange={(v) => setForm((p) => ({ ...p, branch: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Batch</Label>
                <Select
                  value={form.batch}
                  onValueChange={(v) => setForm((p) => ({ ...p, batch: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {placementStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Any TPO notes…"
                className="min-h-[90px]"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={createStudent} disabled={saving}>
                {saving ? "Saving…" : "Add Student"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Detail Panel */}
      {student && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setSelectedStudentId(null)}
          />
          <div className="relative w-full max-w-md bg-card border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {student.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {student.branch} · Batch {student.batch}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudentId(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge status={student.status} />
                <Badge variant="secondary" className="text-xs">
                  CGPA: {student.cgpa}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Applications</p>
                  <p className="text-xl font-bold text-foreground">
                    {countsByStudent.get(student.id)?.applications ?? 0}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Offers</p>
                  <p className="text-xl font-bold text-foreground">
                    {countsByStudent.get(student.id)?.offers ?? 0}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Application Pipeline
                </h3>
                <div className="space-y-2">
                  {studentApps.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No applications yet.
                    </div>
                  )}

                  {studentApps.slice(0, 6).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/40"
                    >
                      <div className="text-sm text-foreground">
                        {a.company} — {a.role}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Upcoming Events
                </h3>
                {upcoming.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No upcoming events.
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {upcoming.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {fmtDate(e.date)} — {e.label} — {e.company}
                        </span>
                        <span className="text-xs">{e.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <StickyNote className="w-4 h-4" /> TPO Notes
                </h3>

                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="min-h-[110px]"
                  placeholder="Write notes about this student…"
                />

                <div className="pt-3 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={saveNotes}
                    disabled={notesSaving}
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    {notesSaving ? "Saving…" : "Save Notes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
