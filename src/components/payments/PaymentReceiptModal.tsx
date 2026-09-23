"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Printer, ShieldCheck } from "lucide-react";
import { PaymentObj } from "@/hooks/useAppData";
import { format } from "date-fns";

interface PaymentReceiptModalProps {
  payment: PaymentObj | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentReceiptModal = ({ payment, open, onOpenChange }: PaymentReceiptModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedPaidAt = payment.paidAt
    ? format(new Date(payment.paidAt), "dd MMMM yyyy, hh:mm a")
    : format(new Date(), "dd MMMM yyyy, hh:mm a");

  const formattedDueDate = payment.dueDate
    ? format(new Date(payment.dueDate), "dd MMM yyyy")
    : "N/A";

  const receiptNum =
    payment.receiptNumber ||
    `REC-${payment._id?.slice(-8).toUpperCase() || payment.id?.slice(-8).toUpperCase() || "SUCCESS"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden sm:rounded-2xl border-stone-200">
        <div ref={printRef} className="p-6 md:p-8 bg-white print:p-8 print:m-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5 mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Crafted LMS" className="h-10 object-contain" />
              <div>
                <h3 className="font-bold text-lg text-stone-900 leading-tight">Crafted Learning Hub</h3>
                <p className="text-xs text-muted-foreground">Official Fee Receipt</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                PAID
              </span>
              <p className="text-xs font-mono text-muted-foreground mt-1.5">{receiptNum}</p>
            </div>
          </div>

          {/* Student & Payment Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-stone-50/80 p-4 rounded-xl border border-stone-100 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Name</p>
              <p className="font-semibold text-stone-900 mt-0.5">{payment.studentName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student ID</p>
              <p className="font-mono text-stone-800 mt-0.5">{payment.studentId}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class & Batch</p>
              <p className="text-stone-800 mt-0.5">
                {payment.classGrade || "10th"} • {payment.batch || "Standard Batch"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Date</p>
              <p className="text-stone-800 mt-0.5">{formattedPaidAt}</p>
            </div>
          </div>

          {/* Fee Table */}
          <div className="border rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b text-xs text-stone-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">Description</th>
                  <th className="py-2.5 px-4 text-center font-medium">Due Date</th>
                  <th className="py-2.5 px-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 px-4 font-medium text-stone-900">
                    Tuition / Course Fee ({payment.classGrade || "Academic Year"})
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">{formattedDueDate}</td>
                  <td className="py-3 px-4 text-right font-semibold text-stone-900">
                    ₹{payment.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-stone-50/50 border-t font-semibold">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-right text-stone-700">Total Paid:</td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-bold text-base">
                    ₹{payment.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Razorpay Gateway Audit Footer */}
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200/60 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-stone-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Verified via Razorpay Gateway
              </span>
              <span className="font-mono text-[11px]">
                {payment.razorpayPaymentId ? `ID: ${payment.razorpayPaymentId}` : "Manual / Online Entry"}
              </span>
            </div>
            {payment.razorpayOrderId && (
              <p className="font-mono text-[10px] text-stone-500">Order Ref: {payment.razorpayOrderId}</p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-stone-50 px-6 py-4 border-t flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="hero" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
