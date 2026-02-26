import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/auth/AuthProvider";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { downloadCSV } from "@/lib/download";

type StudentDoc = {
  instituteId: string;
  name: string;
  branch: string;
  batch: string;
  cgpa: number;
};

type Student = StudentDoc & { id: string };

type AppDoc = {
  instituteId: string;
  studentId: string;
  studentName: string;
  company: string;
  role: string;
  status: string;
  appliedAt?: Timestamp | null;
  createdAt?: any;
  updatedAt?: any;
};

type Application = AppDoc & { id: string };

function toDate(ts?: Timestamp | null) {
  if (!ts) return null;
  return ts.toDate();
}

function msAny(ts: any) {
  try {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    return 0;
  } catch {
    return 0;
  }
}

function normalizeStatus(s: string) {
  const x = (s ?? "").toLowerCase();
  if (x.includes("joined")) return "Joined";
  if (x.includes("offer")) return "Offer";
  if (x.includes("reject")) return "Rejected";
  if (x.includes("interview")) return "Interview";
  if (x.includes("oa")) return "OA";
  if (x.includes("applied")) return "Applied";
  return "Other";
}

function weekKey(d: Date) {
  // week starting Monday
  const t = new Date(d);
  const day = (t.getDay() + 6) % 7; // Mon=0
  t.setDate(t.getDate() - day);
  t.setHours(0, 0, 0, 0);
  return t.toISOString().slice(0, 10);
}

export default function Analytics() {
  const { profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    if (!instituteId) return;

    setLoading(true);

    const u1 = onSnapshot(
      query(
        collection(db, "students"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const list: Student[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as StudentDoc),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(list);
      },
    );

    const u2 = onSnapshot(
      query(
        collection(db, "applications"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const list: Application[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as AppDoc),
        }));
        setApps(list);
        setLoading(false);
      },
    );

    return () => {
      u1();
      u2();
    };
  }, [instituteId]);

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    students.forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  const funnel = useMemo(() => {
    const counts: Record<string, number> = {
      Applied: 0,
      OA: 0,
      Interview: 0,
      Offer: 0,
      Joined: 0,
      Rejected: 0,
      Other: 0,
    };
    for (const a of apps) {
      counts[normalizeStatus(a.status)] =
        (counts[normalizeStatus(a.status)] ?? 0) + 1;
    }
    return counts;
  }, [apps]);

  const funnelPie = useMemo(() => {
    const keys = ["Applied", "OA", "Interview", "Offer", "Joined", "Rejected"];
    return keys
      .map((k) => ({ name: k, value: funnel[k] ?? 0 }))
      .filter((x) => x.value > 0);
  }, [funnel]);

  const topCompanies = useMemo(() => {
    const m = new Map<string, number>();
    apps.forEach((a) => m.set(a.company, (m.get(a.company) ?? 0) + 1));
    const list = Array.from(m.entries()).map(([company, count]) => ({
      company,
      count,
    }));
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 10);
  }, [apps]);

  const offersByBranch = useMemo(() => {
    const m = new Map<string, number>();
    apps.forEach((a) => {
      const s = studentMap.get(a.studentId);
      if (!s) return;
      const st = normalizeStatus(a.status);
      if (st === "Offer" || st === "Joined") {
        m.set(s.branch, (m.get(s.branch) ?? 0) + 1);
      }
    });
    const list = Array.from(m.entries()).map(([branch, offers]) => ({
      branch,
      offers,
    }));
    list.sort((a, b) => b.offers - a.offers);
    return list;
  }, [apps, studentMap]);

  const weeklyTrend = useMemo(() => {
    // last 8 weeks
    const now = new Date();
    const weeks: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weeks.push(weekKey(d));
    }
    const m = new Map<string, number>();
    weeks.forEach((w) => m.set(w, 0));

    apps.forEach((a) => {
      const d =
        toDate(a.appliedAt ?? null) ??
        (msAny(a.createdAt) ? new Date(msAny(a.createdAt)) : null);
      if (!d) return;
      const wk = weekKey(d);
      if (m.has(wk)) m.set(wk, (m.get(wk) ?? 0) + 1);
    });

    return weeks.map((w) => ({
      week: w.slice(5),
      applications: m.get(w) ?? 0,
    }));
  }, [apps]);

  const exportReport = () => {
    const rows = apps.map((a) => {
      const s = studentMap.get(a.studentId);
      return {
        student: a.studentName,
        branch: s?.branch ?? "",
        batch: s?.batch ?? "",
        company: a.company,
        role: a.role,
        status: a.status,
        appliedAt: toDate(a.appliedAt ?? null)?.toISOString?.() ?? "",
      };
    });
    downloadCSV(`tejaskrit_report_${Date.now()}.csv`, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live funnel and trends from Firestore
          </p>
        </div>

        <Button variant="outline" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-base">Placement Funnel</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                {funnelPie.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={funnelPie}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        fill="hsl(var(--primary))"
                        label
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Weekly Applications (Last 8 weeks)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrend}>
                    <XAxis dataKey="week" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="applications"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-base">Top Companies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topCompanies.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No data yet.
                  </div>
                ) : (
                  topCompanies.map((c) => (
                    <div
                      key={c.company}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30"
                    >
                      <span className="text-sm text-foreground">
                        {c.company}
                      </span>
                      <Badge variant="secondary">{c.count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-base">Offers by Branch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {offersByBranch.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No offers yet.
                  </div>
                ) : (
                  offersByBranch.map((b) => (
                    <div
                      key={b.branch}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30"
                    >
                      <span className="text-sm text-foreground">
                        {b.branch}
                      </span>
                      <Badge variant="secondary">{b.offers}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
