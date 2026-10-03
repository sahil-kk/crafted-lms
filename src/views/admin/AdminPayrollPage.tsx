"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Banknote,
  DollarSign,
  Lock,
  Unlock,
  Download,
  Calendar,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPayrollPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  // Period in YYYY-MM format
  const [period, setPeriod] = useState(() => new Date().toISOString().substring(0, 7));

  // Rate Card Modal state
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [selectedTeacherForRate, setSelectedTeacherForRate] = useState<any>(null);
  const [rateInput, setRateInput] = useState<string>("");

  // Finalize / Adjustment Modal state
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [selectedTeacherForFinalize, setSelectedTeacherForFinalize] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("0");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");

  // Fetch live payroll rollups
  const { data, isLoading } = useQuery({
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
      toast.success("Rate card updated!");
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
      queryClient.invalidateQueries({ queryKey: ["payroll-rollups"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update payroll"),
  });

  const rollups = data?.rollups || [];

  // Summary figures
  const totalSessionsCount = rollups.reduce((acc: number, r: any) => acc + (r.completedSessions || 0), 0);
  const totalPayout = rollups.reduce((acc: number, r: any) => acc + (r.grossPay || 0), 0);
  const activeTeachersCount = rollups.length;

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

  const handleReopen = (teacherId: string) => {
    if (confirm("Are you sure you want to reopen this payroll? This unlocks the underlying class register entries.")) {
      finalizeMutation.mutate({
        teacherId,
        period,
        action: "reopen",
      });
    }
  };

  // Export payroll as simple CSV
  const handleExportCSV = () => {
    if (rollups.length === 0) return;
    const headers = ["Teacher Name", "Email", "Subject", "Period", "Confirmed Sessions", "Rate/Session (INR)", "Gross Pay (INR)", "Status"];
    const rows = rollups.map((r: any) => [
      `"${r.teacher.name || r.teacher.username}"`,
      `"${r.teacher.email || ""}"`,
      `"${r.teacher.subject || ""}"`,
      r.period,
      r.completedSessions,
      r.ratePerSession,
      r.grossPay,
      r.isFinalized ? "Finalized / Locked" : "Draft / Open",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Crafted_Payroll_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-36 h-7 text-xs border-0 shadow-none p-0 font-bold text-gray-700"
              />
            </div>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl flex items-center gap-2 h-10"
            >
              <Download className="w-4 h-4" />
              Export Sheet (CSV)
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Mentors</span>
              <UserCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">{activeTeachersCount}</div>
            <span className="text-xs text-gray-400 mt-1 block">Active on platform</span>
          </Card>

          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessions Held</span>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">{totalSessionsCount}</div>
            <span className="text-xs text-emerald-600 font-semibold mt-1 block">Confirmed in {period}</span>
          </Card>

          <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Payroll</span>
              <Banknote className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">₹{totalPayout.toLocaleString("en-IN")}.00</div>
            <span className="text-xs text-gray-400 mt-1 block">Computed via rate cards</span>
          </Card>
        </div>

        {/* Payroll Rollup Table */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">Teacher Payroll Rollup ({period})</h3>
            <span className="text-xs text-gray-400">Zero manual reconstruction required</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-gray-400 animate-pulse">Calculating payroll rollups...</div>
          ) : rollups.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No active teachers found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Mentor</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Subject</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-center">Confirmed Sessions</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-right">Rate / Session</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-right">Gross Pay</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rollups.map((item: any) => {
                  const teacher = item.teacher;
                  return (
                    <TableRow key={teacher._id} className="hover:bg-gray-50/80">
                      <TableCell>
                        <div className="font-bold text-gray-900">{teacher.name || teacher.username}</div>
                        <div className="text-xs text-gray-400">{teacher.email || teacher.phone || "No contact"}</div>
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

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold text-gray-800">₹{item.ratePerSession}</span>
                          {role === "admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRateModal(teacher, item.ratePerSession)}
                              className="text-[11px] text-orange-600 h-6 px-1.5 hover:bg-orange-50"
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-black text-gray-900 text-base">
                        ₹{item.grossPay.toLocaleString("en-IN")}.00
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

                      <TableCell className="text-right">
                        {role === "admin" && (
                          item.isFinalized ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReopen(teacher._id)}
                              className="text-xs text-rose-600 hover:bg-rose-50 h-8 rounded-lg"
                            >
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenFinalize(item)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 rounded-lg"
                            >
                              Finalize & Lock
                            </Button>
                          )
                        )}
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
                Update the per-session payout rate for {selectedTeacherForRate?.name || selectedTeacherForRate?.username}.
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
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
                Note: Updating the rate card will take effect for upcoming sessions without rewriting previously locked periods.
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
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">Finalize & Lock Payroll</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Locking this payroll for {period} makes all underlying class register entries read-only.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFinalizeSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-bold uppercase">Mentor</div>
                <div className="font-bold text-gray-900">
                  {selectedTeacherForFinalize?.teacher?.name || selectedTeacherForFinalize?.teacher?.username}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">Confirmed Sessions:</span>
                  <span className="font-bold text-gray-900 ml-1.5">{selectedTeacherForFinalize?.completedSessions}</span>
                </div>
                <div>
                  <span className="text-gray-500">Gross Pay:</span>
                  <span className="font-bold text-gray-900 ml-1.5">₹{selectedTeacherForFinalize?.grossPay}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Manual Adjustment (+ / - ₹)</Label>
                <Input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Adjustment Reason (if any)</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Performance bonus or transport reimbursement"
                />
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
      </div>
    </DashboardLayout>
  );
}
