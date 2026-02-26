import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyticsChartData } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";

const tabs = ["Placement Funnel", "Company Performance", "Branch/Batch Insights", "Time Trends"];

const funnelColors = [
  "hsl(238, 55%, 48%)",
  "hsl(238, 55%, 55%)",
  "hsl(260, 50%, 55%)",
  "hsl(152, 60%, 42%)",
  "hsl(152, 60%, 35%)",
];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Placement insights & reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" /> Download PDF</Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              i === activeTab ? "bg-card text-foreground card-shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 0 && (
        <div className="bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-foreground mb-6">Overall Placement Funnel</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={analyticsChartData.funnel} barSize={64}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(225, 18%, 90%)", fontSize: 13 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {analyticsChartData.funnel.map((_, i) => (
                  <Cell key={i} fill={funnelColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-foreground mb-6">Company Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Company", "Applications", "Offers", "Conversion %"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyticsChartData.companyPerformance.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{c.company}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{c.applications}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{c.offers}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-primary">{c.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-foreground mb-6">Branch-wise Placement</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={analyticsChartData.branchInsights} barSize={48}>
              <XAxis dataKey="branch" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(225, 18%, 90%)", fontSize: 13 }} />
              <Bar dataKey="placed" fill="hsl(238, 55%, 48%)" radius={[8, 8, 0, 0]} name="Placed" />
              <Bar dataKey="total" fill="hsl(225, 18%, 90%)" radius={[8, 8, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 3 && (
        <div className="bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-foreground mb-6">Weekly Application Trends</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analyticsChartData.weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 18%, 90%)" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(225, 18%, 90%)", fontSize: 13 }} />
              <Line type="monotone" dataKey="applications" stroke="hsl(238, 55%, 48%)" strokeWidth={2.5} dot={{ r: 4 }} name="Applications" />
              <Line type="monotone" dataKey="offers" stroke="hsl(152, 60%, 42%)" strokeWidth={2.5} dot={{ r: 4 }} name="Offers" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pagination mock */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing 1-10 of 24 records</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
          <Button variant="outline" size="sm">2</Button>
          <Button variant="outline" size="sm">3</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
