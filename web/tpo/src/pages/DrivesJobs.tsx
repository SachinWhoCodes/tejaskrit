import { useState } from "react";
import { Plus, Upload, Search, Filter, ChevronRight, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { drivesData, branches, batches } from "@/lib/mock-data";
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

const steps = ["Job Details", "Eligibility", "Dates", "Publish"];

export default function DrivesJobs() {
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);

  const filtered = drivesData.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.company.toLowerCase().includes(search.toLowerCase())
  );

  const drive = selectedDrive ? drivesData.find((d) => d.id === selectedDrive) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drives & Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">Institute-verified campus placements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1.5" /> Import Job
          </Button>
          <Button size="sm" onClick={() => { setWizardOpen(true); setCurrentStep(0); }}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-1.5" /> Filters
        </Button>
      </div>

      {/* Drives Table */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Title</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Company</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Deadline</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">Eligible</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">Applicants</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Status</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{d.title}</span>
                      {d.verified && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">{d.company}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{new Date(d.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-5 py-4 text-sm text-center text-foreground">{d.eligible}</td>
                  <td className="px-5 py-4 text-sm text-center text-foreground">{d.applicants}</td>
                  <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDrive(d.id)}>
                      View <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < currentStep ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role Title</Label>
                  <Input placeholder="e.g. SDE Intern" />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input placeholder="e.g. Google" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="e.g. Bangalore" />
                </div>
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
                  <Input placeholder="e.g. ₹12 LPA or ₹40k/month" />
                </div>
                <div className="space-y-2">
                  <Label>Apply Link</Label>
                  <Input placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job Description</Label>
                <Textarea placeholder="Describe the role, responsibilities, and requirements..." className="min-h-[120px]" />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Eligible Branches</Label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => (
                    <label key={b} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm cursor-pointer hover:bg-secondary transition-colors">
                      <Checkbox /> {b}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch / Year</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{batches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min CGPA</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 7.0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Required Skills</Label>
                <Input placeholder="e.g. Python, SQL, React (comma separated)" />
              </div>
              <div className="space-y-2">
                <Label>Seat Limit (optional)</Label>
                <Input type="number" placeholder="Leave blank for unlimited" />
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">Estimated eligible students: <span className="font-semibold text-foreground">~342</span></p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application Deadline</Label>
                <Input type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label>Online Assessment Date (optional)</Label>
                <Input type="datetime-local" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interview Start Date (optional)</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Interview End Date (optional)</Label>
                  <Input type="date" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Institute Verified</p>
                  <p className="text-xs text-muted-foreground">This drive is verified by the placement cell</p>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Enabled</span>
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Review Summary</p>
                <p className="text-xs text-muted-foreground">Role: SDE Intern — Google — Bangalore</p>
                <p className="text-xs text-muted-foreground">Eligible: CSE, IT — Batch 2026 — Min CGPA 7.0</p>
                <p className="text-xs text-muted-foreground">Deadline: March 15, 2026</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : setWizardOpen(false)}>
              {currentStep > 0 ? "Back" : "Cancel"}
            </Button>
            <Button onClick={() => currentStep < steps.length - 1 ? setCurrentStep(currentStep + 1) : setWizardOpen(false)}>
              {currentStep < steps.length - 1 ? "Next" : "Publish Drive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drive Detail Slide-over */}
      {drive && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setSelectedDrive(null)} />
          <div className="relative w-full max-w-xl bg-card border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{drive.title}</h2>
                <p className="text-sm text-muted-foreground">{drive.company}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDrive(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={drive.status} />
                {drive.verified && <StatusBadge status="Institute Verified" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Eligible Students</p>
                  <p className="text-xl font-bold text-foreground">{drive.eligible}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Applicants</p>
                  <p className="text-xl font-bold text-foreground">{drive.applicants}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Eligibility</p>
                <div className="flex flex-wrap gap-1.5">
                  {["CSE", "IT", "ECE"].map((b) => <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>)}
                  <Badge variant="secondary" className="text-xs">Batch 2026</Badge>
                  <Badge variant="secondary" className="text-xs">Min CGPA 7.0</Badge>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Created by: Dr. Sharma · Feb 10, 2026</p>
                <p>Last updated: Feb 24, 2026</p>
              </div>

              {/* Tabs mock */}
              <div className="border-t border-border pt-4">
                <div className="flex gap-4 border-b border-border mb-4">
                  {["Applicants", "Events", "Instructions", "Analytics"].map((tab, i) => (
                    <button key={tab} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${i === 0 ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-secondary/30 rounded-lg animate-pulse" />
                  ))}
                  <Button variant="outline" size="sm" className="mt-2">Export Applicants</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
