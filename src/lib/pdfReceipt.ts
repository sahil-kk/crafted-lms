import { jsPDF } from "jspdf";
import { formatClassOnly } from "./utils";

export interface PdfReceiptDetails {
  studentName: string;
  studentId: string;
  amount: number;
  receiptNumber?: string;
  paymentId?: string;
  orderId?: string;
  classGrade?: string;
  paymentMethod?: string;
  paidAt?: Date | string;
  description?: string;
}

/**
 * Formats numbers into Indian currency format (e.g., 4,500.00).
 */
function formatCurrency(amt: number): string {
  return amt.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates an official, publication-quality PDF buffer for a fee receipt.
 * Runs 100% in pure Node.js / Vercel Serverless with zero native dependencies.
 */
export function generateFeeReceiptPdf(details: PdfReceiptDetails): Buffer {
  const {
    studentName,
    studentId,
    amount,
    receiptNumber = "CRF-RECEIPT",
    paymentId = "pay_verified",
    orderId = "N/A",
    classGrade,
    paymentMethod = "Razorpay (Online)",
    paidAt = new Date(),
    description = "Tuition & Course Academic Fee",
  } = details;

  const cleanClass = formatClassOnly(classGrade);
  const formattedPaidAt = new Date(paidAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const formattedAmount = formatCurrency(amount);

  // Initialize A4 document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm

  // Outer Border Box
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin - 4, 12, contentWidth + 8, 270, 4, 4, "S");

  // 1. HEADER SECTION
  let y = 24;

  // Left Brand: CRAFTED LEARNING HUB
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(234, 88, 12); // #EA580C
  doc.text("CRAFTED", margin, y);

  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108); // #78716C
  doc.text("LEARNING HUB", margin, y + 5);

  // Center: FEE RECEIPT & Number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(28, 25, 23); // #1C1917
  doc.text("FEE RECEIPT", pageWidth / 2, y, { align: "center" });

  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(231, 229, 228);
  const badgeWidth = 44;
  doc.roundedRect(pageWidth / 2 - badgeWidth / 2, y + 2.5, badgeWidth, 6, 2, 2, "FD");
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text(receiptNumber, pageWidth / 2, y + 6.5, { align: "center" });

  // Right: PAID Badge
  doc.setFillColor(236, 253, 245); // #ECFDF5
  doc.setDrawColor(110, 231, 183); // #6EE7B7
  doc.setLineWidth(0.4);
  const paidWidth = 26;
  doc.roundedRect(pageWidth - margin - paidWidth, y - 5, paidWidth, 9, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(4, 120, 87); // #047857
  doc.text("PAID", pageWidth - margin - paidWidth / 2, y + 1, { align: "center" });

  // Horizontal Header Divider
  y += 14;
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. SUMMARY BOX (Light Orange Tint #FFF9F5)
  y += 6;
  const boxHeight = 36;
  doc.setFillColor(255, 249, 245); // #FFF9F5
  doc.setDrawColor(254, 232, 218); // #FEE8DA
  doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, "FD");

  // Grid Row 1: Student Name & Student ID
  const col1X = margin + 8;
  const col2X = margin + contentWidth / 2 + 8;

  // Student Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158); // #A8A29E
  doc.text("STUDENT NAME", col1X, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(studentName, col1X, y + 14);

  // Student ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text("STUDENT ID", col2X, y + 8);
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(studentId, col2X, y + 14);

  // Grid Row 2: Class & Payment Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text("CLASS", col1X, y + 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(cleanClass, col1X, y + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text("PAYMENT DATE", col2X, y + 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(formattedPaidAt, col2X, y + 28);

  // 3. PARTICULARS TABLE
  y += boxHeight + 8;

  // Table Header
  const tableHeaderHeight = 9;
  doc.setFillColor(250, 250, 249); // #FAFAF9
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(margin, y, contentWidth, tableHeaderHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78); // #57534E
  doc.text("#", margin + 5, y + 6);
  doc.text("PARTICULARS / DESCRIPTION", margin + 16, y + 6);
  doc.text("AMOUNT (INR)", pageWidth - margin - 6, y + 6, { align: "right" });

  // Table Item Row
  y += tableHeaderHeight;
  const rowHeight = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(231, 229, 228);
  doc.rect(margin, y, contentWidth, rowHeight, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(168, 162, 158);
  doc.text("1", margin + 5, y + 8);

  // Description text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(description, margin + 16, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text(`${cleanClass} - ${paymentMethod}`, margin + 16, y + 14);

  // Item Amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`INR ${formattedAmount}`, pageWidth - margin - 6, y + 10, { align: "right" });

  // Total Row
  y += rowHeight;
  const totalHeight = 13;
  doc.setFillColor(255, 249, 245); // #FFF9F5
  doc.setDrawColor(254, 232, 218);
  doc.roundedRect(margin, y, contentWidth, totalHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(41, 37, 36);
  doc.text("Total Paid", pageWidth - margin - 50, y + 8.5);

  doc.setFontSize(13);
  doc.setTextColor(234, 88, 12); // Crafted Orange
  doc.text(`INR ${formattedAmount}`, pageWidth - margin - 6, y + 8.5, { align: "right" });

  // 4. VERIFICATION BOX (Light Green Tint #ECFDF5)
  y += totalHeight + 8;
  const verifyHeight = 22;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208); // #A7F3D0
  doc.roundedRect(margin, y, contentWidth, verifyHeight, 3, 3, "FD");

  // Left Verification Status
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70); // #065F46
  doc.text("Payment Successful", margin + 8, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  doc.text(`Verified via ${paymentMethod}`, margin + 8, y + 14);

  // Right Reference Numbers
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("Payment ID:", pageWidth - margin - 58, y + 8);
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text(paymentId, pageWidth - margin - 6, y + 8, { align: "right" });

  if (orderId && orderId !== "N/A") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Order Ref:", pageWidth - margin - 58, y + 14);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(orderId, pageWidth - margin - 6, y + 14, { align: "right" });
  }

  // 5. THANK YOU NOTE
  y += verifyHeight + 12;
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text("Thank You!", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(
    "We appreciate your trust in Crafted Learning Hub. Keep learning and growing with us.",
    margin,
    y + 5
  );
  doc.text("This is an official computer-generated fee receipt valid for all administrative records.", margin, y + 9);

  // 6. OFFICIAL FOOTER (Border & Contact Info)
  const footerY = 252;
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  doc.text("Crafted Learning Hub  -  Kerala, India", pageWidth / 2, footerY + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    "Email: accounts@craftedlearn.com   |   Phone: +91 7356 324 680   |   Website: craftedlearn.com",
    pageWidth / 2,
    footerY + 11,
    { align: "center" }
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(234, 88, 12);
  doc.text("LEARN FROM THE PEOPLE WHO'VE BEEN THERE AND DONE IT", pageWidth / 2, footerY + 17, { align: "center" });

  // Return generated PDF buffer
  return Buffer.from(doc.output("arraybuffer"));
}
