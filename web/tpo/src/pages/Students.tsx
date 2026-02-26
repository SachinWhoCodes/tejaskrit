import { useState } from "react";
import { Search, Filter, X, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { studentsData, branches, batches, placementStatuses } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Students() {
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const filtered = studentsData.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === "all" || s.branch === branchFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchBranch && matchStatus;
  });

  const student = selectedStudent ? studentsData.find((s) => s.id === selectedStudent) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Students</h1>
        <p className="text-sm text-muted-foreground mt-1">Student directory & placement tracking</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {placementStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {["Name", "Branch", "Batch", "CGPA", "Status", "Applications", "Offers", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-foreground">{s.name}</td>
                  <td className="px-5 py-4"><Badge variant="secondary" className="text-xs">{s.branch}</Badge></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{s.batch}</td>
                  <td className="px-5 py-4 text-sm text-foreground font-medium">{s.cgpa}</td>
                  <td className="px-5 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-4 text-sm text-foreground">{s.applications}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{s.offers}</td>
                  <td className="px-5 py-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(s.id)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Panel */}
      {student && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setSelectedStudent(null)} />
          <div className="relative w-full max-w-md bg-card border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{student.name}</h2>
                <p className="text-sm text-muted-foreground">{student.branch} · Batch {student.batch}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge status={student.status} />
                <Badge variant="secondary" className="text-xs">CGPA: {student.cgpa}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Applications</p>
                  <p className="text-xl font-bold text-foreground">{student.applications}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Offers</p>
                  <p className="text-xl font-bold text-foreground">{student.offers}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Application Pipeline</h3>
                <div className="space-y-2">
                  {["Google — SDE Intern — Interview", "Microsoft — SWE — Offer", "Amazon — SDE-1 — OA"].slice(0, student.applications > 0 ? 3 : 0).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 text-sm text-foreground">{a}</div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Events</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Mar 3 — OA — Amazon SDE-1</p>
                  <p>Mar 5 — Technical Round — Google SDE Intern</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><StickyNote className="w-4 h-4" /> TPO Notes</h3>
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground min-h-[80px]">
                  Strong candidate. Completed all mock interviews. Recommended for Google final round.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
