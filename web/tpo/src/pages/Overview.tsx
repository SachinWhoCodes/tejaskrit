import { Briefcase, Users, FileText, Calendar, Award, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { kpiData, funnelData, todaySchedule, activityLog } from "@/lib/mock-data";

const iconMap: Record<string, React.ElementType> = {
  "briefcase": Briefcase,
  "users": Users,
  "file-text": FileText,
  "calendar": Calendar,
  "award": Award,
  "check-circle": CheckCircle,
};

export default function Overview() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TPO Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">National Institute of Technology, Trichy — Placement Cell</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Last updated: 5 min ago</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi, i) => {
          const Icon = iconMap[kpi.icon] || Briefcase;
          return (
            <div key={i} className="bg-card rounded-xl p-5 card-shadow border border-border hover:card-shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/8">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString()}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{kpi.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{kpi.change}</p>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Funnel + Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Drive Funnel */}
        <div className="lg:col-span-3 bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-foreground mb-6">Drive Funnel</h2>
          <div className="flex items-end justify-between gap-3 h-48">
            {funnelData.map((stage, i) => {
              const maxCount = funnelData[0].count;
              const heightPct = (stage.count / maxCount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stage.count}</span>
                  <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 24 }}>
                    <div className="absolute inset-0 rounded-t-lg" style={{ backgroundColor: stage.color }} />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground text-center">{stage.stage}</span>
                </div>
              );
            })}
          </div>
          {/* Arrow indicators */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            {funnelData.slice(0, -1).map((_, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="w-3 h-3" />}
                <span>{Math.round((funnelData[i + 1].count / funnelData[i].count) * 100)}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-foreground mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {todaySchedule.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="text-xs font-mono font-medium text-primary bg-primary/8 px-2 py-1 rounded-md whitespace-nowrap">
                  {item.time}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.event}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.drive} · {item.students} students</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-1">
          {activityLog.map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{item.action}</span>
                  <span className="text-muted-foreground"> — {item.detail}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{item.time}</p>
                <p className="text-[11px] text-muted-foreground">{item.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
