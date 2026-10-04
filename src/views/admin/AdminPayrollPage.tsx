"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Banknote,
  Lock,
  Unlock,
  Download,
  Calendar,
  UserCheck,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  X,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPayrollPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  // Period in YYYY-MM format
  const [period, setPeriod] = useState(() => new Date().toISOString().substring(0, 7));

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "finalized" | "missing_rate">("all");

  // Rate Card Modal state
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [selectedTeacherForRate, setSelectedTeacherForRate] = useState<any>(null);
  const [rateInput, setRateInput] = useState<string>("");

  // Finalize / Adjustment Modal state
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [selectedTeacherForFinalize, setSelectedTeacherForFinalize] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("0");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");

  // Reopen Modal state
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [teacherToReopen, setTeacherToReopen] = useState<any>(null);

  // Fetch live payroll rollups
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payroll-rollups", period],
    queryFn: async () => {
      const res = await apiClient<any>(`/api/payroll?period=${period}`);
      return res;
    },
  });

  // Set rate card mutation
  const setRateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient<any>("/api/rate-cards", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("Rate card updated successfully");
      setRateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payroll-rollups"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update rate card"),
  });

  // Finalize / Reopen payroll mutation
  const finalizeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient<any>("/api/payroll", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (res: any) => {
      toast.success(res.message || "Payroll state updated");
      setFinalizeModalOpen(false);
      setReopenModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payroll-rollups"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update payroll"),
  });

  const rollups: any[] = data?.rollups || [];

  // Summary figures
  const totalSessionsCount = rollups.reduce((acc: number, r: any) => acc + (r.completedSessions || 0), 0);
  const totalOtherSessions = rollups.reduce((acc: number, r: any) => acc + (r.otherSessions || 0), 0);
  const totalPayout = rollups.reduce((acc: number, r: any) => acc + (r.grossPay || 0), 0);
  const totalAdjustments = rollups.reduce((acc: number, r: any) => acc + (r.savedRecord?.adjustments || 0), 0);
  const totalNetPayout = totalPayout + totalAdjustments;
  const activeTeachersCount = rollups.length;
  const finalizedCount = rollups.filter((r: any) => r.isFinalized).length;
  const missingRateCount = rollups.filter((r: any) => !r.hasRateCard || r.ratePerSession === 0).length;
  const teachersWithSessionsWithoutRate = rollups.filter(
    (r: any) => r.completedSessions > 0 && (!r.hasRateCard || r.ratePerSession === 0)
  );

  // Filtered rollups
  const filteredRollups = useMemo(() => {
    return rollups.filter((item: any) => {
      const t = item.teacher;
      const matchesSearch = [t.name, t.username, t.email, t.phone, t.subject]
        .some((val) => val?.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (statusFilter === "finalized") return item.isFinalized;
      if (statusFilter === "open") return !item.isFinalized;
      if (statusFilter === "missing_rate") return !item.hasRateCard || item.ratePerSession === 0;
      return true;
    });
  }, [rollups, searchQuery, statusFilter]);

  const handleOpenRateModal = (t: any, currentRate: number) => {
    setSelectedTeacherForRate(t);
    setRateInput(currentRate ? String(currentRate) : "1000");
    setRateModalOpen(true);
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForRate) return;
    setRateMutation.mutate({
      teacherId: selectedTeacherForRate._id,
      ratePerSession: Number(rateInput),
    });
  };

  const handleOpenFinalize = (item: any) => {
    setSelectedTeacherForFinalize(item);
    setAdjustmentAmount(String(item.savedRecord?.adjustments || "0"));
    setAdjustmentReason(item.savedRecord?.adjustmentReason || "");
    setFinalizeModalOpen(true);
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForFinalize) return;
    finalizeMutation.mutate({
      teacherId: selectedTeacherForFinalize.teacher._id,
      period,
      adjustments: Number(adjustmentAmount) || 0,
      adjustmentReason,
      action: "finalize",
    });
  };

  const handlePromptReopen = (item: any) => {
    setTeacherToReopen(item);
    setReopenModalOpen(true);
  };

  const handleConfirmReopen = () => {
    if (!teacherToReopen) return;
    finalizeMutation.mutate({
      teacherId: teacherToReopen.teacher._id,
      period,
      action: "reopen",
    });
  };

  // Export payroll as simple CSV
  const handleExportCSV = () => {
    if (rollups.length === 0) {
      toast.error("No payroll records available to export");
      return;
    }
    const headers = [
      "Teacher Name",
      "Email",
      "Subject",
      "Period",
      "Confirmed Sessions",
      "Cancelled / Absent Sessions",
      "Rate/Session (INR)",
      "Gross Pay (INR)",
      "Adjustments (INR)",
      "Adjustment Reason",
      "Net Payable (INR)",
      "Status",
    ];
    const rows = rollups.map((r: any) => {
      const adj = r.savedRecord?.adjustments || 0;
      const net = r.grossPay + adj;
      return [
        `"${r.teacher.name || r.teacher.username}"`,
        `"${r.teacher.email || ""}"`,
        `"${r.teacher.subject || ""}"`,
        r.period,
        r.completedSessions,
        r.otherSessions || 0,
        r.ratePerSession,
        r.grossPay,
        adj,
        `"${r.savedRecord?.adjustmentReason || ""}"`,
        net,
        r.isFinalized ? "Finalized / Locked" : "Draft / Open",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Crafted_Payroll_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payroll sheet exported successfully");
  };

  // Live calculation for finalize dialog
  const currentGross = selectedTeacherForFinalize?.grossPay || 0;
  const currentAdj = Number(adjustmentAmount) || 0;
  const calculatedNet = currentGross + currentAdj;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hours & Payroll</h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-0.5">
                Automated 1:1 Session Count
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Live session aggregation from teacher confirmations. Rate cards are automatically applied to calculate gross pay.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-36 h-7 text-xs border-0 shadow-none p-0 font-bold text-gray-700 focus-visible:ring-0"
              />
            </div>

            <Button
              onClick={() => refetch()}
              variant="outline"
              size="icon"
              title="Refresh rollups"
              disabled={isFetching}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl h-10 w-10 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-orange-500" : ""}`} />
            </Button>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl flex items-center gap-2 h-10 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Sheet (CSV)
            </Button>
          </div>
        </div>

        {/* Warning Banner: Missing Rate Cards with Sessions */}
        {teachersWithSessionsWithoutRate.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Rate Card Attention Required ({teachersWithSessionsWithoutRate.length}{" "}
                  {teachersWithSessionsWithoutRate.length === 1 ? "mentor" : "mentors"})
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Some mentors have held confirmed sessions this month but do not have an active rate card configured. Set
                  their rate cards to calculate accurate payroll.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("missing_rate")}
              className="shrink-0 bg-white border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold rounded-xl"
            >
              View Unconfigured Mentors
            </Button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Mentors</span>
              <UserCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">{activeTeachersCount}</div>
            <span className="text-xs text-gray-400 mt-1 block">
              {activeTeachersCount - missingRateCount} configured • {missingRateCount} without rate
            </span>
          </Card>

          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessions Held</span>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">{totalSessionsCount}</div>
            <span className="text-xs text-emerald-600 font-semibold mt-1 block">
              +{totalOtherSessions} absent/cancelled (₹0 pay)
            </span>
          </Card>

          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Payroll</span>
              <Banknote className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">₹{totalPayout.toLocaleString("en-IN")}.00</div>
            <span className="text-xs text-gray-500 mt-1 block">
              Net Payable: <span className="font-bold text-gray-700">₹{totalNetPayout.toLocaleString("en-IN")}.00</span>
            </span>
          </Card>

          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lock Status</span>
              {finalizedCount === activeTeachersCount && activeTeachersCount > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <Unlock className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">
              {finalizedCount} / {activeTeachersCount}
            </div>
            <span className="text-xs font-semibold mt-1 block text-gray-500">
              {finalizedCount === activeTeachersCount && activeTeachersCount > 0 ? (
                <span className="text-emerald-600">All mentors locked</span>
              ) : (
                <span className="text-amber-600">{activeTeachersCount - finalizedCount} open for edits</span>
              )}
            </span>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search mentor by name, email or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-gray-200 focus-visible:ring-1 focus-visible:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold pl-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span>Status:</span>
            </div>
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-9 text-xs w-[180px] rounded-xl border-gray-200">
                <SelectValue placeholder="All Mentors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mentors ({rollups.length})</SelectItem>
                <SelectItem value="open">Open / Draft ({rollups.filter((r: any) => !r.isFinalized).length})</SelectItem>
                <SelectItem value="finalized">Finalized & Locked ({finalizedCount})</SelectItem>
                <SelectItem value="missing_rate">Missing Rate Card ({missingRateCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payroll Rollup Table */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Teacher Payroll Rollup ({period})</h3>
              <Badge variant="outline" className="text-[11px] font-bold text-gray-500">
                {filteredRollups.length} of {rollups.length} mentors
              </Badge>
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline">Zero manual reconstruction required</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-gray-400 animate-pulse">Calculating payroll rollups...</div>
          ) : filteredRollups.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <p className="text-sm">No mentors match the selected criteria.</p>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="font-bold text-xs uppercase text-gray-600 pl-5">Mentor</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Subject</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-center">Confirmed Sessions</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-center">Rate / Session</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-right">Gross Pay</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-center">Adjustments</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-right">Net Payable</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-right pr-5">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRollups.map((item: any) => {
                  const teacher = item.teacher;
                  const adjustment = item.savedRecord?.adjustments || 0;
                  const netPay = item.grossPay + adjustment;
                  const hasValidRate = item.hasRateCard && item.ratePerSession > 0;

                  return (
                    <TableRow key={teacher._id} className="hover:bg-gray-50/80">
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-black shrink-0">
                            {(teacher.name || teacher.username || "T").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{teacher.name || teacher.username}</div>
                            <div className="text-xs text-gray-400">{teacher.email || teacher.phone || "No contact"}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold text-gray-700 bg-gray-50">
                          {teacher.subject || "General"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="text-base font-black text-gray-900">{item.completedSessions}</span>
                        {item.otherSessions > 0 && (
                          <span className="text-[10px] text-gray-400 block">
                            +{item.otherSessions} cancelled/absent
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {hasValidRate ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-semibold text-gray-800">₹{item.ratePerSession}</span>
                            {role === "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenRateModal(teacher, item.ratePerSession)}
                                className="text-[11px] text-orange-600 h-6 px-1.5 hover:bg-orange-50 font-bold"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                              No Rate
                            </Badge>
                            {role === "admin" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenRateModal(teacher, 1000)}
                                className="text-[11px] text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100 h-6 px-2 font-bold"
                              >
                                Set Rate
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-black text-gray-900 text-sm">
                        ₹{item.grossPay.toLocaleString("en-IN")}.00
                      </TableCell>

                      <TableCell className="text-center">
                        {adjustment !== 0 ? (
                          <Badge
                            className={`text-[11px] font-bold ${
                              adjustment > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                            title={item.savedRecord?.adjustmentReason || ""}
                          >
                            {adjustment > 0 ? `+₹${adjustment}` : `-₹${Math.abs(adjustment)}`}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-black text-gray-900 text-base">
                        ₹{netPay.toLocaleString("en-IN")}.00
                      </TableCell>

                      <TableCell className="text-center">
                        {item.isFinalized ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2 py-0.5">
                            <Lock className="w-3 h-3 mr-1 inline" /> Finalized
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold px-2 py-0.5">
                            <Unlock className="w-3 h-3 mr-1 inline" /> Open
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        {role === "admin" &&
                          (item.isFinalized ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePromptReopen(item)}
                              className="text-xs text-rose-600 hover:bg-rose-50 h-8 rounded-lg font-bold"
                            >
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenFinalize(item)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 rounded-lg shadow-sm"
                            >
                              Finalize & Lock
                            </Button>
                          ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Modal: Edit Rate Card */}
        <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Set Session Rate Card</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Update the fixed per-session payout rate for {selectedTeacherForRate?.name || selectedTeacherForRate?.username}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveRate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Rate per 1:1 Session (₹)</Label>
                <Input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  min="0"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
                Note: Updating the rate card will automatically take effect for upcoming sessions and unfinalized periods
                without rewriting previously locked records.
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setRateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={setRateMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  Save Rate Card
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Finalize Payroll & Adjustments */}
        <Dialog open={finalizeModalOpen} onOpenChange={setFinalizeModalOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Finalize & Lock Payroll</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Review sessions and apply optional bonuses or adjustments before locking month {period}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFinalizeSubmit} className="space-y-4 py-2">
              <div className="p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-bold uppercase">Mentor</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {selectedTeacherForFinalize?.teacher?.name || selectedTeacherForFinalize?.teacher?.username}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-xs">
                  <div>
                    <span className="text-gray-400 block">Completed Sessions</span>
                    <span className="font-bold text-gray-800 text-sm">{selectedTeacherForFinalize?.completedSessions}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Rate / Session</span>
                    <span className="font-bold text-gray-800 text-sm">₹{selectedTeacherForFinalize?.ratePerSession}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block">Gross Pay</span>
                    <span className="font-bold text-gray-800 text-sm">₹{currentGross.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Adjustments Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700">Manual Adjustment (+ / - ₹)</Label>
                  <span className="text-[11px] text-gray-400">Bonus, allowance, or deduction</span>
                </div>
                <Input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="0"
                />

                {/* Quick adjustment presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Presets:</span>
                  {[
                    { label: "+₹500 Bonus", amount: "500", reason: "Performance Bonus" },
                    { label: "+₹1,000 Bonus", amount: "1000", reason: "Excellence Bonus" },
                    { label: "+₹500 Travel", amount: "500", reason: "Travel Allowance" },
                    { label: "-₹500 Penalty", amount: "-500", reason: "Late Cancellation Penalty" },
                    { label: "₹0 Reset", amount: "0", reason: "" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setAdjustmentAmount(preset.amount);
                        if (preset.reason) setAdjustmentReason(preset.reason);
                      }}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Adjustment Note / Reason</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Mentorship milestone bonus or travel allowance"
                />
              </div>

              {/* Live Net Calculation Summary Box */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Total Net Payable</span>
                  <span className="text-[11px] text-emerald-600">
                    Gross (₹{currentGross.toLocaleString("en-IN")}) {currentAdj >= 0 ? `+ ₹${currentAdj}` : `- ₹${Math.abs(currentAdj)}`}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700">₹{calculatedNet.toLocaleString("en-IN")}.00</div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Locking this payroll makes all confirmed sessions for this mentor in {period} read-only in the Class Register.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setFinalizeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={finalizeMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Confirm & Lock Month
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Confirm Reopen Payroll */}
        <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Reopen Payroll</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Unlocking this payroll will switch status back to Draft and allow edits to class register entries for this month.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-800 space-y-1">
              <span className="font-bold block">Mentor: {teacherToReopen?.teacher?.name || teacherToReopen?.teacher?.username}</span>
              <p>
                Period: <span className="font-semibold">{period}</span>
              </p>
              <p className="pt-1 text-rose-700">
                Are you sure you want to proceed? Any previously finalized adjustments will remain as draft values until locked again.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setReopenModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmReopen}
                disabled={finalizeMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Yes, Reopen Month
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
