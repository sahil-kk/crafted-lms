"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, DollarSign, CreditCard, Send, CheckCircle, AlertCircle, Clock, Trash2, Receipt, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData, PaymentObj } from "@/hooks/useAppData";
import { apiClient } from "@/lib/apiClient";
import { formatClassOnly } from "@/lib/utils";
import { format } from "date-fns";
import { PaymentReceiptModal } from "@/components/payments/PaymentReceiptModal";

const AdminPayments = () => {
  const { users, payments, createPayment, deletePayment, updatePayment, updateLocalPayment, refreshData } = useAppData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentObj | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [reminderLoadingId, setReminderLoadingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const students = users.filter((u) => u.role === "student");

  // Form State
  const [form, setForm] = useState({
    studentId: "",
    amount: "",
    status: "pending" as const,
    dueDate: "",
    description: "Tuition & Course Academic Fee",
  });

  const onCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === form.studentId || (s as any)._id === form.studentId);
    if (!student) {
      toast.error("Please select a student");
      return;
    }

    try {
      setIsCreating(true);
      const cleanClass = formatClassOnly(student.course || "10th");

      await createPayment({
        studentId: student.id || (student as any)._id,
        studentName: student.full_name,
        amount: Number(form.amount),
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : new Date().toISOString(),
        classGrade: cleanClass,
        description: form.description?.trim() || "Tuition & Course Academic Fee",
      });

      toast.success("Invoice created successfully!");
      setOpen(false);
      setForm({
        studentId: "",
        amount: "",
        status: "pending",
        dueDate: "",
        description: "Tuition & Course Academic Fee",
      });
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkAsPaid = async (payment: PaymentObj) => {
    const id = payment._id || payment.id;
    if (!id) return;

    try {
      setActionLoadingId(id);
      await updatePayment(id, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });
      toast.success(`Invoice for ${payment.studentName} marked as PAID`);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark invoice as paid");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReminder = async (payment: PaymentObj) => {
    const id = payment._id || payment.id;
    if (!id) return;

    try {
      setReminderLoadingId(id);
      const res = await apiClient<{
        success: boolean;
        message: string;
        payment?: any;
      }>(`/payments/${id}/reminder`, {
        method: "POST",
      });

      if (res.success) {
        toast.success(res.message || `Payment reminder email sent to ${payment.studentName}`);
        if (res.payment) {
          updateLocalPayment(res.payment);
        }
        await refreshData();
      } else {
        toast.error(res.message || "Failed to send payment reminder");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send payment reminder email");
    } finally {
      setReminderLoadingId(null);
    }
  };

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments
      .filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        return (
          p.studentName.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
        );
      })
      .sort((a, b) => new Date(b.dueDate || "").getTime() - new Date(a.dueDate || "").getTime());
  }, [payments, query, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!payments) return { totalPaid: 0, totalPending: 0, totalOverdue: 0 };
    return payments.reduce(
      (acc, p) => {
        if (p.status === "paid") acc.totalPaid += p.amount;
        else if (p.status === "pending") acc.totalPending += p.amount;
        else if (p.status === "overdue") acc.totalOverdue += p.amount;
        return acc;
      },
      { totalPaid: 0, totalPending: 0, totalOverdue: 0 }
    );
  }, [payments]);

  return (
    <DashboardLayout role="admin" title="Fee & Payments Management">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Payments Management</h2>
          <p className="text-muted-foreground mt-1">Track fee invoices, send real payment reminders, and record payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={onCreateInvoice}>
              <DialogHeader>
                <DialogTitle>Create Student Invoice</DialogTitle>
                <DialogDescription>Generate a new fee payment request for a student.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Student</Label>
                  <Select value={form.studentId} onValueChange={(val) => setForm({ ...form, studentId: val })}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} ({formatClassOnly(student.course || "10th")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description / Particulars</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Tuition & Course Academic Fee, Term 1 Fee"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Appears directly on the student fee receipt particulars.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      required
                      placeholder="e.g. 15000"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      required
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Initial Status</Label>
                  <Select value={form.status} onValueChange={(val: any) => setForm({ ...form, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" variant="hero" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Invoice"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Fees Collected</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="font-display text-3xl font-extrabold text-foreground">₹{stats.totalPaid.toLocaleString()}</h3>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-6 shadow-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending Receivables</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="font-display text-3xl font-extrabold text-foreground">₹{stats.totalPending.toLocaleString()}</h3>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-6 shadow-card border-red-500/20 bg-gradient-to-br from-red-500/5 to-rose-500/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Overdue Payments</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="font-display text-3xl font-extrabold text-foreground">₹{stats.totalOverdue.toLocaleString()}</h3>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-6 shadow-card border-border/60">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student or particulars..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Filter Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No payment transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Student & Particulars</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((p: PaymentObj) => {
                  const paymentKey = p._id || p.id || "";
                  const isMarkingPaid = actionLoadingId === paymentKey;
                  const isSendingReminder = reminderLoadingId === paymentKey;

                  return (
                    <TableRow key={paymentKey}>
                      <TableCell className="pl-4">
                        <div className="font-semibold text-foreground">{p.studentName}</div>
                        <div className="text-xs text-muted-foreground">{p.description || "Tuition & Course Academic Fee"}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-stone-800">
                          {formatClassOnly(p.classGrade)}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        ₹{p.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(p.dueDate || ""), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {p.status === "paid" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              <CheckCircle className="h-3.5 w-3.5" /> Paid
                            </span>
                          ) : p.status === "overdue" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 animate-pulse">
                              <AlertCircle className="h-3.5 w-3.5" /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-1">
                            {p.razorpayPaymentId && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-[#f97316] border border-orange-200">
                                <ShieldCheck className="h-2.5 w-2.5" /> Razorpay
                              </span>
                            )}
                            {p.reminderCount && p.reminderCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Send className="h-2.5 w-2.5" /> Reminded ({p.reminderCount}x)
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1.5 items-center">
                          {p.status === "paid" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 text-xs text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                              onClick={() => setSelectedReceipt(p)}
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Receipt
                            </Button>
                          )}
                          {p.status !== "paid" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isMarkingPaid}
                                className="h-8 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleMarkAsPaid(p)}
                              >
                                {isMarkingPaid ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Mark Paid"
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={isSendingReminder}
                                title="Send fee payment reminder email to student & parent"
                                className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleSendReminder(p)}
                              >
                                {isSendingReminder ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => deletePayment(p._id! || p.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <PaymentReceiptModal
        payment={selectedReceipt}
        open={Boolean(selectedReceipt)}
        onOpenChange={(open) => {
          if (!open) setSelectedReceipt(null);
        }}
      />
    </DashboardLayout>
  );
};

export default AdminPayments;
