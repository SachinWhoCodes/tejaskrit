import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Users,
  ClipboardList,
  CalendarClock,
  TrendingUp,
  ShieldCheck,
  Bell,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/auth/AuthProvider";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

type InstituteDoc = {
  name: string;
  code?: string | null;
  allowedDomains?: string[];
  createdBy?: string;
};

type DriveDoc = {
  instituteId: string;
  title: string;
  company: string;
  status: "Active" | "Closed" | string;
  verified?: boolean;
  deadlineAt?: Timestamp;
  createdAt?: any;
};

type StudentDoc = {
  instituteId: string;
  name: string;
  branch: string;
  batch: string;
  cgpa: number;
  status: string;
  updatedAt?: any;
};

type AppDoc = {
  instituteId: string;

  studentId: string;
  studentName: string;

  company: string;
  role: string;

  status: string; // Applied / OA Scheduled / Interview Scheduled / Offer / Joined / Rejected
  appliedAt?: Timestamp | null;

  nextEventLabel?: string | null;
  nextEventAt?: Timestamp | null;

  updatedAt?: any;
  createdAt?: any;
};

type AnnouncementDoc = {
  instituteId: string;
  title: string;
  pinned: boolean;
  targetLabel: string;
  createdAt?: any;
};

function toDate(ts?: Timestamp | null) {
  if (!ts) return null;
  return ts.toDate();
}

function toMsAny(ts: any): number {
  // handles Firestore Timestamp or missing
  try {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    return 0;
  } catch {
    return 0;
  }
}

function fmtTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function withinDays(ms: number, days: number) {
  const now = Date.now();
  return ms >= now - days * 24 * 60 * 60 * 1000;
}

function isInterviewStatus(s: string) {
  const x = (s ?? "").toLowerCase();
  return x.includes("interview");
}
function isOfferStatus(s: string) {
  const x = (s ?? "").toLowerCase();
  return x === "offer" || x.includes("offer");
}
function isJoinedStatus(s: string) {
  return (s ?? "").toLowerCase() === "joined";
}
function isAppliedStatus(s: string) {
  const x = (s ?? "").toLowerCase();
  return x === "applied" || x.includes("applied");
}
function isOaStatus(s: string) {
  return (s ?? "").toLowerCase().includes("oa");
}

export default function Overview() {
  const { profile, user } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [inst, setInst] = useState<InstituteDoc | null>(null);

  const [drives, setDrives] = useState<Array<DriveDoc & { id: string }>>([]);
  const [students, setStudents] = useState<Array<StudentDoc & { id: string }>>(
    [],
  );
  const [apps, setApps] = useState<Array<AppDoc & { id: string }>>([]);
  const [ann, setAnn] = useState<Array<AnnouncementDoc & { id: string }>>([]);

  const [loading, setLoading] = useState(true);

  // institute
  useEffect(() => {
    if (!instituteId) return;
    const ref = doc(db, "institutes", instituteId);
    const unsub = onSnapshot(ref, (snap) => {
      setInst((snap.data() as InstituteDoc) ?? null);
    });
    return () => unsub();
  }, [instituteId]);

  // data streams
  useEffect(() => {
    if (!instituteId) return;

    setLoading(true);

    const u1 = onSnapshot(
      query(collection(db, "drives"), where("instituteId", "==", instituteId)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as DriveDoc),
        }));
        // sort by deadline desc (client)
        list.sort((a: any, b: any) => {
          const ams = toDate(a.deadlineAt)?.getTime?.() ?? 0;
          const bms = toDate(b.deadlineAt)?.getTime?.() ?? 0;
          return bms - ams;
        });
        setDrives(list);
      },
    );

    const u2 = onSnapshot(
      query(
        collection(db, "students"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as StudentDoc),
        }));
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setStudents(list);
      },
    );

    const u3 = onSnapshot(
      query(
        collection(db, "applications"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as AppDoc),
        }));
        // sort by updated/created
        list.sort((a, b) => {
          const ams =
            (toMsAny(a.updatedAt) ||
              toMsAny(a.createdAt) ||
              toDate(a.appliedAt ?? null)?.getTime?.()) ??
            0;
          const bms =
            (toMsAny(b.updatedAt) ||
              toMsAny(b.createdAt) ||
              toDate(b.appliedAt ?? null)?.getTime?.()) ??
            0;
          return bms - ams;
        });
        setApps(list);
      },
    );

    const u4 = onSnapshot(
      query(
        collection(db, "announcements"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as AnnouncementDoc),
        }));
        list.sort((a, b) => toMsAny(b.createdAt) - toMsAny(a.createdAt));
        setAnn(list);
      },
    );

    // mark loaded once first ticks arrive
    const t = setTimeout(() => setLoading(false), 400);
    return () => {
      clearTimeout(t);
      u1();
      u2();
      u3();
      u4();
    };
  }, [instituteId]);

  const kpis = useMemo(() => {
    const now = Date.now();

    const activeDrives = drives.filter((d) => {
      const closed = (d.status ?? "").toLowerCase() === "closed";
      const deadlineMs = toDate(d.deadlineAt ?? null)?.getTime?.() ?? Infinity;
      return !closed && deadlineMs >= now;
    }).length;

    const totalStudents = students.length;

    const applicationsThisWeek = apps.filter((a) => {
      const ms =
        toDate(a.appliedAt ?? null)?.getTime?.() || toMsAny(a.createdAt) || 0;
      return withinDays(ms, 7);
    }).length;

    const interviewsScheduled = apps.filter((a) =>
      isInterviewStatus(a.status),
    ).length;
    const offers = apps.filter((a) => isOfferStatus(a.status)).length;
    const joined = apps.filter((a) => isJoinedStatus(a.status)).length;

    return {
      activeDrives,
      totalStudents,
      applicationsThisWeek,
      interviewsScheduled,
      offers,
      joined,
    };
  }, [drives, students, apps]);

  const funnel = useMemo(() => {
    const applied = apps.filter((a) => isAppliedStatus(a.status)).length;
    const oa = apps.filter((a) => isOaStatus(a.status)).length;
    const interview = apps.filter((a) => isInterviewStatus(a.status)).length;
    const offer = apps.filter((a) => isOfferStatus(a.status)).length;
    const joined = apps.filter((a) => isJoinedStatus(a.status)).length;
    return { applied, oa, interview, offer, joined };
  }, [apps]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const list = apps
      .filter((a) => a.nextEventAt?.toDate?.())
      .map((a) => ({
        id: a.id,
        when: a.nextEventAt?.toDate?.() ?? null,
        label: a.nextEventLabel ?? "Next event",
        student: a.studentName,
        company: a.company,
        role: a.role,
      }))
      .filter((e) => (e.when?.getTime?.() ?? 0) >= now)
      .sort((a, b) => (a.when?.getTime?.() ?? 0) - (b.when?.getTime?.() ?? 0))
      .slice(0, 8);
    return list;
  }, [apps]);

  const recentActivity = useMemo(() => {
    const items: Array<{
      type: string;
      title: string;
      whenMs: number;
      meta?: string;
    }> = [];

    drives.forEach((d) => {
      items.push({
        type: "drive",
        title: `${d.company} — ${d.title}`,
        whenMs: toMsAny(d.createdAt),
        meta: d.verified ? "Institute Verified" : undefined,
      });
    });

    ann.forEach((a) => {
      items.push({
        type: "announcement",
        title: a.title,
        whenMs: toMsAny(a.createdAt),
        meta: a.pinned ? "Pinned" : a.targetLabel,
      });
    });

    apps.forEach((a) => {
      items.push({
        type: "application",
        title: `${a.studentName} — ${a.company} (${a.role})`,
        whenMs: toMsAny(a.updatedAt) || toMsAny(a.createdAt),
        meta: a.status,
      });
    });

    items.sort((a, b) => b.whenMs - a.whenMs);
    return items.slice(0, 10);
  }, [drives, ann, apps]);

  const headerName = inst?.name ?? "Your Institute";
  const headerSub = inst?.code
    ? `${inst.code} · ${profile?.role ?? "tpo"}`
    : `${profile?.role ?? "tpo"}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">TPO Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {headerName} · {headerSub}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Active Drives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeDrives}</div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Applications (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.applicationsThisWeek}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.interviewsScheduled}</div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.offers}</div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Joined
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.joined}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Funnel */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Drive Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Applied", funnel.applied],
              ["OA", funnel.oa],
              ["Interview", funnel.interview],
              ["Offer", funnel.offer],
              ["Joined", funnel.joined],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge variant="secondary" className="text-sm">
                  {value as any}
                </Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Live counts computed from Applications in Firestore.
            </p>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="card-shadow xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" /> Today’s / Upcoming Schedule
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.assign("/applications")}
            >
              Open Applications
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upcoming OA/interview events.
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/40"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {e.label} — {e.company}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.student} · {e.role}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {fmtTime(e.when)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No recent activity yet. Create a drive or add applications.
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {it.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {it.type.toUpperCase()} {it.meta ? `· ${it.meta}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {it.whenMs
                      ? new Date(it.whenMs).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Logged in as: {user?.email ?? user?.uid}
      </div>
    </div>
  );
}
