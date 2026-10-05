"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  User,
  CreditCard,
  BookOpen,
  Calendar,
  Check,
  Printer,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { PaymentObj, useAppData } from "@/hooks/useAppData";
import { format } from "date-fns";
import { apiClient } from "@/lib/apiClient";

interface PaymentReceiptModalProps {
  payment: PaymentObj | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatClassOnly = (grade?: string): string => {
  if (!grade) return "Class 10";
  const trimmed = grade.trim();
  if (/^class\s*\d+/i.test(trimmed)) {
    return trimmed.replace(/^class\s*/i, "Class ");
  }
  const match = trimmed.match(/\d+/);
  if (match) {
    return `Class ${match[0]}`;
  }
  return trimmed;
};

// Reusable Receipt Content Component for both Screen Modal and Print Portal
const ReceiptContent = ({
  payment,
  resolvedStudentId,
  formattedPaidAt,
  receiptNum,
  formatAmount,
}: {
  payment: PaymentObj;
  resolvedStudentId: string;
  formattedPaidAt: string;
  receiptNum: string;
  formatAmount: (amt: number) => string;
}) => {
  return (
    <div className="relative z-10 space-y-4 text-stone-900 bg-white">
      {/* Top Header Row - Centered FEE RECEIPT */}
      <div className="grid grid-cols-3 items-center gap-3 border-b border-stone-200 pb-3">
        {/* Left: Crafted Logo */}
        <div className="flex items-center justify-start">
          <img
            src="/craftedlonglogo-with-tm.svg"
            alt="Crafted Learning Hub"
            className="h-9 sm:h-11 w-auto object-contain"
          />
        </div>

        {/* Center: FEE RECEIPT & Receipt Number Badge */}
        <div className="text-center flex flex-col items-center justify-center">
          <h2 className="text-sm sm:text-base tracking-[0.28em] font-extrabold text-stone-800 uppercase leading-none">
            FEE RECEIPT
          </h2>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium border border-stone-200">
            <span className="text-stone-500">Receipt No.</span>
            <span className="font-bold text-stone-900 font-mono tracking-tight">{receiptNum}</span>
          </div>
        </div>

        {/* Right: Verified Paid Badge */}
        <div className="flex items-center justify-end">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
            PAID
          </span>
        </div>
      </div>

      {/* Student & Payment Summary Box */}
      <div className="bg-[#FFF9F5] rounded-2xl p-4 border border-[#FEE8DA] grid grid-cols-2 gap-y-3 gap-x-6">
        {/* Student Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0 border border-[#FED7AA]">
            <User className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">STUDENT NAME</p>
            <p className="text-sm sm:text-base font-bold text-stone-900 truncate mt-0.5">
              {payment.studentName || "Student"}
            </p>
          </div>
        </div>

        {/* Student ID */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0 border border-[#FED7AA]">
            <CreditCard className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">STUDENT ID</p>
            <p className="text-sm sm:text-base font-bold text-stone-900 font-mono tracking-tight mt-0.5">
              {resolvedStudentId}
            </p>
          </div>
        </div>

        {/* Class */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0 border border-[#FED7AA]">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">CLASS</p>
            <p className="text-xs sm:text-sm font-bold text-stone-800 mt-0.5">
              {formatClassOnly(payment.classGrade)}
            </p>
          </div>
        </div>

        {/* Payment Date */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0 border border-[#FED7AA]">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">PAYMENT DATE</p>
            <p className="text-xs sm:text-sm font-semibold text-stone-800 mt-0.5">{formattedPaidAt}</p>
          </div>
        </div>
      </div>

      {/* Standard Fee Description Table with .00 */}
      <div className="rounded-xl overflow-hidden border border-stone-200 shadow-xs bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600">
              <th className="py-2.5 px-4 text-center w-12 font-semibold">#</th>
              <th className="py-2.5 px-4 text-left font-semibold">PARTICULARS / DESCRIPTION</th>
              <th className="py-2.5 px-5 text-right font-semibold">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            <tr>
              <td className="py-3 px-4 text-center text-stone-400 font-medium">1</td>
              <td className="py-3 px-4 text-left">
                <p className="font-semibold text-stone-900 text-sm">
                  {payment.description || "Tuition & Course Academic Fee"}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 font-medium">
                  {formatClassOnly(payment.classGrade)}
                </p>
              </td>
              <td className="py-3 px-5 text-right font-semibold text-stone-900 text-sm sm:text-base">
                ₹{formatAmount(payment.amount)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-[#FFF9F5] border-t border-[#FEE8DA]">
              <td colSpan={2} className="py-3 px-6 text-right font-bold text-stone-800 text-sm">
                Total Paid
              </td>
              <td className="py-3 px-5 text-right">
                <div className="flex items-center justify-end gap-2.5">
                  <span className="text-stone-300 font-light">|</span>
                  <span className="text-lg sm:text-xl font-black text-[#EA580C]">
                    ₹{formatAmount(payment.amount)}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Successful Verification Box */}
      <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white shrink-0">
            <Check className="w-4.5 h-4.5 stroke-[3]" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#065F46] leading-tight">Payment Successful</h4>
            <p className="text-[11px] text-[#047857] font-medium mt-0.5">Verified via Razorpay Gateway</p>
          </div>
        </div>

        <div className="text-right space-y-0.5 text-xs font-mono">
          <div className="flex justify-end items-center gap-2">
            <span className="text-stone-500 text-[11px] font-sans">Payment ID</span>
            <span className="font-semibold text-stone-800">
              {payment.razorpayPaymentId || "pay_verified"}
            </span>
          </div>
          {payment.razorpayOrderId && (
            <div className="flex justify-end items-center gap-2">
              <span className="text-stone-500 text-[11px] font-sans">Order Ref.</span>
              <span className="text-stone-700">{payment.razorpayOrderId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Thank You Note */}
      <div className="pt-1.5 border-t border-stone-100">
        <div
          className="text-2xl text-stone-900 font-medium tracking-wide select-none"
          style={{
            fontFamily: "'Caveat', 'Brush Script MT', 'Dancing Script', cursive, Georgia, serif",
          }}
        >
          Thank You!
        </div>
        <p className="text-xs text-stone-600 mt-0.5 leading-relaxed max-w-lg">
          We appreciate your trust in Crafted Learning Hub. Keep learning and growing with us.
        </p>
      </div>

      {/* Official Contact Info Footer */}
      <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-stone-700 whitespace-nowrap">
          <div className="w-5.5 h-5.5 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0">
            <Mail className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[9px] font-semibold text-stone-400 uppercase block leading-none">Email</span>
            <span className="font-medium text-stone-800 text-[11.5px]">accounts@craftedlearn.com</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-stone-700 whitespace-nowrap border-l border-stone-200 pl-3">
          <div className="w-5.5 h-5.5 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0">
            <Phone className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[9px] font-semibold text-stone-400 uppercase block leading-none">Phone</span>
            <span className="font-medium text-stone-800 text-[11.5px]">+91 7356 324 680</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-stone-700 whitespace-nowrap border-l border-stone-200 pl-3">
          <div className="w-5.5 h-5.5 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] shrink-0">
            <Globe className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[9px] font-semibold text-stone-400 uppercase block leading-none">Website</span>
            <span className="font-medium text-stone-800 text-[11.5px]">craftedlearn.com</span>
          </div>
        </div>
      </div>

      {/* Bottom Centered Brand Slogan With Real Tagline */}
      <div className="text-center pt-0.5">
        <p className="text-[9.5px] font-bold text-[#EA580C] tracking-[0.22em] uppercase">
          CRAFTED LEARNING HUB
        </p>
        <p className="text-[8px] font-semibold text-stone-400 tracking-[0.18em] uppercase mt-0.5">
          LEARN FROM THE PEOPLE WHO&apos;VE BEEN THERE AND DONE IT
        </p>
      </div>
    </div>
  );
};

export const PaymentReceiptModal = ({ payment, open, onOpenChange }: PaymentReceiptModalProps) => {
  const { users } = useAppData();
  const [fetchedStudentId, setFetchedStudentId] = useState<string>("");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to test if an ID looks like an unformatted 24-character hexadecimal MongoDB ObjectId
  const isMongoId = (val?: string) => Boolean(val && /^[0-9a-fA-F]{24}$/.test(val.trim()));

  // 1. Look up student in cached app data users
  const matchedStudent = users?.find(
    (u: any) =>
      (payment?.studentId && (u.id === payment.studentId || u._id === payment.studentId)) ||
      (payment?.studentId && u.studentId && u.studentId.toLowerCase() === payment.studentId.toLowerCase()) ||
      (payment?.studentName && u.full_name && u.full_name.trim().toLowerCase() === payment.studentName.trim().toLowerCase())
  );

  // 2. Dynamically fetch the clean human-readable studentId if needed
  useEffect(() => {
    if (!payment) return;

    if (matchedStudent?.studentId && !isMongoId(matchedStudent.studentId)) {
      setFetchedStudentId(matchedStudent.studentId);
      return;
    }

    if (payment.studentId && !isMongoId(payment.studentId)) {
      setFetchedStudentId(payment.studentId);
      return;
    }

    // Fetch from students API to resolve MongoDB ObjectId to real Student ID (e.g. C1002)
    apiClient<any[]>("/students")
      .then((studentsList) => {
        if (Array.isArray(studentsList)) {
          const found = studentsList.find(
            (s) =>
              s._id === payment.studentId ||
              s.id === payment.studentId ||
              (payment.studentName && s.name?.trim().toLowerCase() === payment.studentName?.trim().toLowerCase())
          );
          if (found?.studentId) {
            setFetchedStudentId(found.studentId);
          }
        }
      })
      .catch(() => {});
  }, [payment, matchedStudent]);

  if (!payment) return null;

  const resolvedStudentId =
    fetchedStudentId ||
    (matchedStudent?.studentId && !isMongoId(matchedStudent.studentId) ? matchedStudent.studentId : "") ||
    (payment.studentId && !isMongoId(payment.studentId) ? payment.studentId : "") ||
    matchedStudent?.studentId ||
    payment.studentId ||
    "C1001";

  const formattedPaidAt = payment.paidAt
    ? format(new Date(payment.paidAt), "dd MMMM yyyy, hh:mm a")
    : format(new Date(), "dd MMMM yyyy, hh:mm a");

  // Format as CRF-[StudentID]-[Seq], e.g. CRF-C1002-01
  let receiptNum = payment.receiptNumber || "";
  if (!receiptNum || receiptNum.startsWith("REC-")) {
    const studentTag = resolvedStudentId && !isMongoId(resolvedStudentId) ? resolvedStudentId : "C1001";
    receiptNum = `CRF-${studentTag}-01`;
  }

  const handlePrint = () => {
    const originalTitle = document.title;
    // Set custom filename for Chrome's "Save As PDF" dialog
    document.title = `Crafted_Receipt_${receiptNum}`;

    window.print();

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  const formatAmount = (amt: number) => {
    return amt.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
      {/* Global Print Stylesheet: Exclusively isolate #crafted-receipt-print-area during print */}
      <style dangerouslySetInnerHTML={{ __html: `
        #crafted-receipt-print-area {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide entire website and all modals from print */
          body > *:not(#crafted-receipt-print-area) {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }

          /* Show ONLY the direct portal print area starting at top of Page 1 */
          #crafted-receipt-print-area {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 720px !important;
            margin: 0 auto !important;
            padding: 10px 16px !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #crafted-receipt-print-area * {
            visibility: visible !important;
          }
        }
      ` }} />

      {/* Direct-to-Body Print Portal (Ensures 100% clean single-page print without modal transform or dashboard bleed) */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div id="crafted-receipt-print-area">
          <ReceiptContent
            payment={payment}
            resolvedStudentId={resolvedStudentId}
            formattedPaidAt={formattedPaidAt}
            receiptNum={receiptNum}
            formatAmount={formatAmount}
          />
        </div>,
        document.body
      )}

      {/* Screen Interactive Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl sm:max-w-[720px] md:max-w-3xl p-0 overflow-hidden sm:rounded-3xl border-stone-200/90 shadow-2xl bg-white focus:outline-none max-h-[92vh] flex flex-col">
          {/* Scrollable Receipt Preview Area */}
          <div className="overflow-y-auto flex-1 p-5 sm:p-7 relative bg-white">
            {/* Subtle Organic Background Curves */}
            <div className="absolute top-0 right-0 w-80 h-72 pointer-events-none -z-0 opacity-40 overflow-hidden">
              <svg viewBox="0 0 320 280" fill="none" className="w-full h-full">
                <path
                  d="M320 0C250 30 180 120 220 200C260 280 300 270 320 280V0Z"
                  fill="url(#topRightGradient)"
                />
                <defs>
                  <linearGradient id="topRightGradient" x1="320" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FED7AA" stopOpacity="0.8" />
                    <stop stopColor="#FFF7ED" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-72 h-64 pointer-events-none -z-0 opacity-30 overflow-hidden">
              <svg viewBox="0 0 280 240" fill="none" className="w-full h-full">
                <path
                  d="M0 240C60 210 120 140 90 70C60 0 20 20 0 0V240Z"
                  fill="url(#bottomLeftGradient)"
                />
                <defs>
                  <linearGradient id="bottomLeftGradient" x1="0" y1="240" x2="110" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FED7AA" stopOpacity="0.8" />
                    <stop stopColor="#FFF7ED" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <ReceiptContent
              payment={payment}
              resolvedStudentId={resolvedStudentId}
              formattedPaidAt={formattedPaidAt}
              receiptNum={receiptNum}
              formatAmount={formatAmount}
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="bg-stone-50 px-6 py-3 border-t border-stone-200/80 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-2 bg-[#EA580C] hover:bg-[#c2410c] text-white shadow-xs"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
