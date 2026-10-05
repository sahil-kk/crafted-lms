"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppData, PaymentObj } from "@/hooks/useAppData";
import { useRazorpay } from "@/hooks/useRazorpay";
import { PaymentReceiptModal } from "@/components/payments/PaymentReceiptModal";
import { format } from "date-fns";
import { formatClassOnly } from "@/lib/utils";

export const StudentPayments = () => {
  const { user } = useAuth();
  const { payments, updateLocalPayment, refreshData } = useAppData();
  const { initiatePayment, isProcessing, processingPaymentId } = useRazorpay();

  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentObj | null>(null);

  // Filter payments for this student
  const myPayments = useMemo(() => {
    if (!payments) return [];
    const validStudentIds = [user?.id, user?.studentId, (user as any)?._id]
      .filter(Boolean)
      .map(String);

    return payments.filter((p) => {
      // If studentId matches or user's id matches
      return validStudentIds.includes(String(p.studentId));
    });
  }, [payments, user]);

  const stats = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let overdue = 0;
    let pendingCount = 0;

    myPayments.forEach((p) => {
      if (p.status === "paid") {
        paid += p.amount;
      } else {
        pending += p.amount;
        pendingCount += 1;
        if (p.dueDate && new Date(p.dueDate).getTime() < Date.now()) {
          overdue += p.amount;
        }
      }
    });

    return { pending, paid, overdue, pendingCount };
  }, [myPayments]);

  const filteredList = useMemo(() => {
    return myPayments.filter((p) => {
      if (filter === "pending") return p.status === "pending" || p.status === "overdue";
      if (filter === "paid") return p.status === "paid";
      return true;
    });
  }, [myPayments, filter]);

  const handlePayNow = (payment: PaymentObj) => {
    initiatePayment({
      payment,
      onSuccess: async (updated) => {
        updateLocalPayment(updated);
        setSelectedReceipt(updated);
        await refreshData();
      },
    });
  };

  return (
    <DashboardLayout role="student" title="Fee & Payments">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Fee & Payments</h2>
            <p className="text-muted-foreground mt-1">
              View your pending fee dues, pay securely via Razorpay, and download receipts
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-[#f97316]" />
            Razorpay Secure 256-Bit Encrypted
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-border/60 bg-gradient-to-br from-white to-orange-50/40 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Dues
                </p>
                <h3 className="text-2xl font-bold text-stone-900 mt-1">
                  ₹{stats.pending.toLocaleString("en-IN")}
                </h3>
                <p className="text-xs text-orange-600 font-medium mt-1">
                  {stats.pendingCount} invoice{stats.pendingCount === 1 ? "" : "s"} due
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[#f97316]">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-border/60 bg-gradient-to-br from-white to-emerald-50/40 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Paid
                </p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                  ₹{stats.paid.toLocaleString("en-IN")}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">All verified & cleared</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-border/60 bg-gradient-to-br from-white to-amber-50/40 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Overdue Amount
                </p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  ₹{stats.overdue.toLocaleString("en-IN")}
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {stats.overdue > 0 ? "Immediate clearance required" : "No overdue invoices"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-3 overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 shrink-0">
            <Button
              variant={filter === "all" ? "hero" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className="rounded-lg text-xs whitespace-nowrap"
            >
              All Invoices ({myPayments.length})
            </Button>
            <Button
              variant={filter === "pending" ? "hero" : "ghost"}
              size="sm"
              onClick={() => setFilter("pending")}
              className="rounded-lg text-xs whitespace-nowrap"
            >
              Pending ({myPayments.filter((p) => p.status !== "paid").length})
            </Button>
            <Button
              variant={filter === "paid" ? "hero" : "ghost"}
              size="sm"
              onClick={() => setFilter("paid")}
              className="rounded-lg text-xs whitespace-nowrap"
            >
              Paid Receipts ({myPayments.filter((p) => p.status === "paid").length})
            </Button>
          </div>
        </div>

        {/* Invoice List */}
        {filteredList.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-muted-foreground mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-stone-800">No invoices found</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              There are no fee records matching the selected filter. Any fee assigned to your student profile will appear here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredList.map((payment) => {
              const paymentId = payment._id || payment.id;
              const isPaid = payment.status === "paid";
              const isCurrentlyPaying = isProcessing && processingPaymentId === paymentId;
              const isOverdue =
                !isPaid &&
                payment.dueDate &&
                new Date(payment.dueDate).getTime() < Date.now();

              return (
                <Card
                  key={paymentId}
                  className="p-5 border-border/70 hover:border-orange-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-stone-900 text-base">
                        {payment.description || "Tuition & Course Academic Fee"} ({formatClassOnly(payment.classGrade)})
                      </span>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="h-3 w-3" /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" /> Due Soon
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>
                        Due Date:{" "}
                        <strong className="text-stone-700 font-medium">
                          {payment.dueDate
                            ? format(new Date(payment.dueDate), "dd MMM yyyy")
                            : "N/A"}
                        </strong>
                      </span>
                      {isPaid && payment.paidAt && (
                        <span>
                          Paid on:{" "}
                          <strong className="text-emerald-700 font-medium">
                            {format(new Date(payment.paidAt), "dd MMM yyyy, hh:mm a")}
                          </strong>
                        </span>
                      )}
                      {payment.receiptNumber && (
                        <span className="font-mono text-[11px] text-stone-500">
                          Receipt: {payment.receiptNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-xs text-muted-foreground">Payable Amount</p>
                      <p className="text-xl font-bold text-stone-900">
                        ₹{payment.amount.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      {isPaid ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReceipt(payment)}
                          className="gap-1.5 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          View Receipt
                        </Button>
                      ) : (
                        <Button
                          variant="hero"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handlePayNow(payment)}
                          className="gap-2 text-xs font-semibold px-4"
                        >
                          {isCurrentlyPaying ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay Now with Razorpay
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Receipt Dialog */}
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

export default StudentPayments;
