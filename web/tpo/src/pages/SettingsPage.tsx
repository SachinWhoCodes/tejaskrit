import { useEffect, useMemo, useState } from "react";
import { Database, Download, Trash2, Wand2, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/auth/AuthProvider";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { downloadText } from "@/lib/download";

type InstituteDoc = {
  name: string;
  code?: string | null;
  allowedDomains?: string[];
  createdBy?: string;
};

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [inst, setInst] = useState<InstituteDoc | null>(null);
  const [busy, setBusy] = useState<null | "seed" | "wipe" | "export">(null);

  useEffect(() => {
    if (!instituteId) return;
    const unsub = onSnapshot(doc(db, "institutes", instituteId), (snap) => {
      setInst((snap.data() as InstituteDoc) ?? null);
    });
    return () => unsub();
  }, [instituteId]);

  const canRun = useMemo(() => !!user && !!instituteId, [user, instituteId]);

  const seedDemoData = async () => {
    if (!user || !instituteId) return;

    setBusy("seed");
    try {
      const companies = [
        "Google",
        "Microsoft",
        "Amazon",
        "Flipkart",
        "Swiggy",
        "Zomato",
        "Paytm",
        "Razorpay",
        "Infosys",
        "TCS",
      ];
      const roles = [
        "SDE Intern",
        "Backend Intern",
        "Frontend Intern",
        "Data Analyst Intern",
        "ML Intern",
        "SDE-1",
        "QA Intern",
      ];
      const branches = ["CSE", "IT", "ECE", "ME", "CE"];
      const batches = ["2025", "2026", "2027"];

      const names = [
        "Aarav Patel",
        "Ananya Sharma",
        "Rohan Verma",
        "Ishita Gupta",
        "Aditya Singh",
        "Sneha Iyer",
        "Kunal Mehta",
        "Pooja Nair",
        "Rahul Jain",
        "Priya Das",
        "Vikram Rao",
        "Nisha Kumari",
        "Sahil Khan",
        "Meera Joshi",
        "Arjun Saha",
        "Tanya Roy",
        "Harsh Vardhan",
        "Sana Ali",
        "Devansh Tripathi",
        "Ritika Sen",
      ];

      const statuses = [
        "Applied",
        "OA Scheduled",
        "Interview Scheduled",
        "Offer",
        "Rejected",
        "Joined",
      ];

      // keep under 500 writes
      const STUDENTS = 18;
      const DRIVES = 8;
      const APPLICATIONS = 45;
      const ANNOUNCEMENTS = 4;

      const batch = writeBatch(db);

      // create drives refs
      const driveRefs = Array.from({ length: DRIVES }).map(() =>
        doc(collection(db, "drives")),
      );
      const driveData = driveRefs.map((ref, i) => {
        const company = rand(companies);
        const title = rand(roles);
        const deadline = Timestamp.fromDate(daysFromNow(randInt(3, 20)));
        return {
          instituteId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          title,
          company,
          location: rand(["Remote", "Bangalore", "Hyderabad", "Pune", "Delhi"]),
          jobType: rand(["intern", "full-time"]),
          ctcOrStipend: rand([
            "₹40k/month",
            "₹60k/month",
            "₹12 LPA",
            "₹18 LPA",
          ]),
          applyUrl: "https://example.com/apply",
          jdText: "Demo job description for hackathon. Replace with real JD.",
          verified: true,
          status: "Active",
          eligibility: {
            branches: [rand(branches)],
            batch: rand(batches),
            minCgpa: 7.0,
            skills: ["DSA", "React", "SQL"].slice(0, randInt(1, 3)),
            seatLimit: randInt(10, 60),
          },
          deadlineAt: deadline,
          oaAt: null,
          interviewStartAt: null,
          interviewEndAt: null,
          stats: { eligibleEstimate: randInt(150, 600), applicants: 0 },
        };
      });
      driveRefs.forEach((r, idx) => batch.set(r, driveData[idx]));

      // create students refs
      const studentRefs = Array.from({ length: STUDENTS }).map(() =>
        doc(collection(db, "students")),
      );
      const studentData = studentRefs.map((ref, i) => {
        const name = names[i % names.length];
        return {
          instituteId,
          name,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@college.edu`,
          rollNo: `2026${rand(["CSE", "IT", "ECE"])}${String(100 + i)}`,
          branch: rand(branches),
          batch: rand(batches),
          cgpa: Number((Math.random() * 2 + 7.0).toFixed(2)),
          status: rand(["Not Started", "In Process", "Unplaced", "Placed"]),
          notes: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      });
      studentRefs.forEach((r, idx) => batch.set(r, studentData[idx]));

      // applications refs
      const appRefs = Array.from({ length: APPLICATIONS }).map(() =>
        doc(collection(db, "applications")),
      );
      const appData = appRefs.map((ref, i) => {
        const stIdx = randInt(0, studentRefs.length - 1);
        const drIdx = randInt(0, driveRefs.length - 1);

        const studentId = studentRefs[stIdx].id;
        const studentName = studentData[stIdx].name;

        const driveId = driveRefs[drIdx].id;
        const driveTitle = driveData[drIdx].title;

        const company = driveData[drIdx].company;
        const role = driveData[drIdx].title;

        const status = rand(statuses);

        const appliedAt = Timestamp.fromDate(daysFromNow(-randInt(0, 21)));

        const nextEventAt =
          status === "OA Scheduled" || status === "Interview Scheduled"
            ? Timestamp.fromDate(daysFromNow(randInt(1, 10)))
            : null;

        const nextEventLabel =
          status === "OA Scheduled"
            ? "OA"
            : status === "Interview Scheduled"
              ? "Interview Round"
              : null;

        return {
          instituteId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),

          studentId,
          studentName,

          company,
          role,

          status,
          appliedAt,

          nextEventLabel,
          nextEventAt,

          outcome:
            status === "Offer"
              ? "Offer Received"
              : status === "Joined"
                ? "Joined"
                : status === "Rejected"
                  ? "Not selected"
                  : "Pending",
          notes: "",
          resumeName: null,
          resumeUrl: null,

          driveId,
          driveTitle,
        };
      });
      appRefs.forEach((r, idx) => batch.set(r, appData[idx]));

      // announcements refs
      const annRefs = Array.from({ length: ANNOUNCEMENTS }).map(() =>
        doc(collection(db, "announcements")),
      );
      const annData = annRefs.map((ref, i) => ({
        instituteId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        title: i === 0 ? "📌 Drive instructions" : `Announcement ${i + 1}`,
        message:
          i === 0
            ? "Please ensure all eligible students apply before the deadline. Keep resumes updated."
            : "This is demo data for hackathon presentation.",
        targetType: "all",
        targetLabel: "All Students",
        pinned: i === 0,
        delivered: 500,
        opened: 320,
        scheduledAt: null,
      }));
      annRefs.forEach((r, idx) => batch.set(r, annData[idx]));

      await batch.commit();

      toast({
        title: "Seed complete",
        description:
          "Demo drives, students, applications, announcements added.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Seed failed",
        description: e?.message ?? "Check Firestore.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const wipeInstituteData = async () => {
    if (!instituteId) return;
    setBusy("wipe");
    try {
      // Delete docs for instituteId across collections
      const collectionsToWipe = [
        "applications",
        "students",
        "drives",
        "announcements",
      ];
      for (const colName of collectionsToWipe) {
        const snap = await getDocs(
          query(
            collection(db, colName),
            where("instituteId", "==", instituteId),
          ),
        );
        // batch delete in chunks
        let batch = writeBatch(db);
        let count = 0;
        for (const d of snap.docs) {
          batch.delete(d.ref);
          count++;
          if (count % 450 === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
        await batch.commit();
      }

      toast({
        title: "Wipe complete",
        description: "Institute demo data removed.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Wipe failed",
        description: e?.message ?? "Could not wipe data.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const exportInstituteSnapshot = async () => {
    if (!instituteId) return;
    setBusy("export");
    try {
      const cols = [
        "institutes",
        "drives",
        "students",
        "applications",
        "announcements",
      ];
      const payload: any = {
        exportedAt: new Date().toISOString(),
        instituteId,
        institute: inst ?? null,
      };

      for (const colName of cols) {
        if (colName === "institutes") continue;
        const snap = await getDocs(
          query(
            collection(db, colName),
            where("instituteId", "==", instituteId),
          ),
        );
        payload[colName] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      downloadText(
        `tejaskrit_export_${Date.now()}.json`,
        JSON.stringify(payload, null, 2),
        "application/json;charset=utf-8",
      );
      toast({ title: "Exported", description: "JSON snapshot downloaded." });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workspace controls (test mode)
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Institute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-foreground">
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{inst?.name ?? "—"}</span>
            </div>
            <div className="text-sm text-foreground">
              <span className="text-muted-foreground">Code:</span>{" "}
              <span className="font-medium">{inst?.code ?? "—"}</span>
            </div>
            <div className="text-sm text-foreground">
              <span className="text-muted-foreground">InstituteId:</span>{" "}
              <Badge variant="secondary">{instituteId ?? "—"}</Badge>
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              Allowed domains: {(inst?.allowedDomains ?? []).join(", ") || "—"}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-foreground">
              <span className="text-muted-foreground">Role:</span>{" "}
              <Badge variant="secondary">{profile?.role ?? "—"}</Badge>
            </div>
            <div className="text-sm text-foreground">
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="text-sm text-foreground">
              <span className="text-muted-foreground">UID:</span>{" "}
              <Badge variant="secondary">{user?.uid ?? "—"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" /> Data Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={seedDemoData} disabled={!canRun || busy !== null}>
            {busy === "seed" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Seed Demo Data
          </Button>

          <Button
            variant="outline"
            onClick={exportInstituteSnapshot}
            disabled={!canRun || busy !== null}
          >
            {busy === "export" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export JSON
          </Button>

          <Button
            variant="destructive"
            onClick={wipeInstituteData}
            disabled={!canRun || busy !== null}
          >
            {busy === "wipe" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Wipe Institute Data
          </Button>

          <p className="text-xs text-muted-foreground w-full pt-2">
            Seed creates demo drives/students/applications/announcements for
            presentation. Wipe removes those docs for your institute only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
