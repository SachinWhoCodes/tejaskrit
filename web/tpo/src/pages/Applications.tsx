import { useState } from "react";
import { Search, Filter, Download, Megaphone, X, Clock, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { applicationsData, applicationStatuses } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function Applications() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = applicationsData.filter((a) => {
    const matchSearch = a.student.toLowerCase().includes(search.toLowerCase()) || a.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const detail = detailId ? applicationsData.find((a) => a.id === detailId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Central application tracking across all drives</p>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.length} selected</span>
            <Button variant="outline" size="sm"><Megaphone className="w-4 h-4 mr-1.5" /> Announce</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by student or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {applicationStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1.5" /> More Filters</Button>
      </div>

      {/* Filter chips */}
      {statusFilter !== "all" && (
        <div className="flex items-center gap-2">
          <StatusBadge status={statusFilter} />
          <button onClick={() => setStatusFilter("all")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-3.5 w-10">
                  <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((a) => a.id))} />
                </th>
                {["Company", "Role", "Student", "Status", "Applied On", "Next Event", "Outcome"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setDetailId(a.id)}>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggleSelect(a.id)} />
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-foreground">{a.company}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{a.role}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{a.student}</td>
                  <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{new Date(a.appliedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{a.nextEvent}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{a.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setDetailId(null)} />
          <div className="relative w-full max-w-md bg-card border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{detail.student}</h2>
                <p className="text-sm text-muted-foreground">{detail.company} — {detail.role}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-6">
              <StatusBadge status={detail.status} />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Timeline</h3>
                <div className="space-y-3">
                  {[
                    { event: "Applied", date: detail.appliedOn, done: true },
                    { event: "OA Scheduled", date: "Mar 3, 2026", done: detail.status !== "Applied" },
                    { event: "Interview", date: "Mar 5, 2026", done: ["Interview", "Offer", "Joined"].includes(detail.status) },
                    { event: "Outcome", date: detail.outcome, done: ["Offer", "Rejected", "Joined"].includes(detail.status) },
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${t.done ? "bg-primary" : "bg-border"}`} />
                      <div>
                        <p className={`text-sm ${t.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{t.event}</p>
                        <p className="text-xs text-muted-foreground">{t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><FileText className="w-4 h-4" /> Resume</h3>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/40 text-sm text-muted-foreground">
                  <Paperclip className="w-4 h-4" /> resume_aarav_patel.pdf
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground min-h-[60px]">
                  Cleared OA with 95th percentile. Strong DSA skills.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
