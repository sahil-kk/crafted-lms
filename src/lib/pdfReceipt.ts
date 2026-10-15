import sharp from "sharp";
import { jsPDF } from "jspdf";
import { parse, Font, PathCommand } from "opentype.js";
import { formatClassOnly } from "./utils";
import { format } from "date-fns";
import {
  CRAFTED_LONG_LOGO_BASE64,
  CRAFTED_ICON_BASE64,
  THANK_YOU_SCRIPT_BASE64,
  GEIST_FONT_BASE64,
} from "./receiptAssets";

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

let cachedFont: Font | null = null;

function getReceiptFont(): Font {
  if (cachedFont) return cachedFont;
  const buf = Buffer.from(GEIST_FONT_BASE64, "base64");
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  cachedFont = parse(ab);
  return cachedFont;
}

function commandsToPathData(commands: PathCommand[]): string {
  let d = "";
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === "M") {
      d += `M${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)}`;
    } else if (cmd.type === "L") {
      d += `L${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)}`;
    } else if (cmd.type === "C") {
      d += `C${cmd.x1.toFixed(2)} ${cmd.y1.toFixed(2)} ${cmd.x2.toFixed(2)} ${cmd.y2.toFixed(2)} ${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)}`;
    } else if (cmd.type === "Q") {
      d += `Q${cmd.x1.toFixed(2)} ${cmd.y1.toFixed(2)} ${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)}`;
    } else if (cmd.type === "Z") {
      d += "Z";
    }
  }
  return d;
}

interface RenderTextOptions {
  color?: string;
  weight?: "normal" | "bold" | "black";
  align?: "left" | "center" | "right";
  letterSpacing?: number;
}

function renderText(
  font: Font,
  text: string | number | undefined | null,
  x: number,
  y: number,
  size: number,
  options: RenderTextOptions = {}
): string {
  if (text == null || text === "") return "";
  const str = String(text);
  const color = options.color || "#1c1917";
  const weight = options.weight || "normal";
  const align = options.align || "left";
  const letterSpacing = options.letterSpacing || 0;

  const width = font.getAdvanceWidth(str, size, letterSpacing ? { letterSpacing } : undefined);

  let startX = x;
  if (align === "center") {
    startX = x - width / 2;
  } else if (align === "right") {
    startX = x - width;
  }

  const p = font.getPath(str, startX, y, size, letterSpacing ? { letterSpacing } : undefined);
  const d = commandsToPathData(p.commands);

  let strokeAttr = "";
  if (weight === "bold") {
    strokeAttr = `stroke="${color}" stroke-width="${(size * 0.038).toFixed(2)}" stroke-linejoin="round"`;
  } else if (weight === "black") {
    strokeAttr = `stroke="${color}" stroke-width="${(size * 0.065).toFixed(2)}" stroke-linejoin="round"`;
  }

  return `<path d="${d}" fill="${color}" ${strokeAttr} />`;
}

interface InlineSegment {
  text: string | number | undefined | null;
  color?: string;
  size: number;
  weight?: "normal" | "bold" | "black";
  letterSpacing?: number;
}

function renderInlineTexts(
  font: Font,
  segments: InlineSegment[],
  x: number,
  y: number,
  options: { align?: "left" | "center" | "right" } = {}
): string {
  const align = options.align || "left";
  let totalWidth = 0;
  const segWidths: number[] = [];

  for (const seg of segments) {
    if (!seg.text) {
      segWidths.push(0);
      continue;
    }
    const w = font.getAdvanceWidth(
      String(seg.text),
      seg.size,
      seg.letterSpacing ? { letterSpacing: seg.letterSpacing } : undefined
    );
    segWidths.push(w);
    totalWidth += w;
  }

  let currX = x;
  if (align === "right") {
    currX = x - totalWidth;
  } else if (align === "center") {
    currX = x - totalWidth / 2;
  }

  let out = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.text) continue;
    out += renderText(font, seg.text, currX, y, seg.size, {
      color: seg.color,
      weight: seg.weight,
      letterSpacing: seg.letterSpacing,
      align: "left",
    });
    currX += segWidths[i];
  }
  return out;
}

function formatCurrency(amt: number): string {
  return amt.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates a 100% pixel-perfect PDF fee receipt matching the portal's PaymentReceiptModal.
 * Renders all text as pure vector SVG paths using opentype.js and Geist font, eliminating
 * all system font/fontconfig dependencies and preventing tofu boxes on Linux/Vercel serverless.
 */
export async function generateFeeReceiptPdf(details: PdfReceiptDetails): Promise<Buffer> {
  const {
    studentName,
    studentId,
    amount,
    receiptNumber,
    paymentId,
    orderId,
    classGrade,
    paymentMethod,
    paidAt,
    description,
  } = details;

  const font = getReceiptFont();
  const cleanClass = formatClassOnly(classGrade);
  const formattedAmount = formatCurrency(amount);

  let cleanReceiptNum = receiptNumber || "";
  if (!cleanReceiptNum || cleanReceiptNum === "CRF-RECEIPT" || cleanReceiptNum.startsWith("REC-")) {
    const tag = studentId && !/^[0-9a-fA-F]{24}$/.test(studentId) ? studentId : "C1001";
    cleanReceiptNum = `CRF-${tag}-01`;
  }

  let formattedPaidAt = "";
  try {
    const dateObj = paidAt ? new Date(paidAt) : new Date();
    if (isNaN(dateObj.getTime())) {
      formattedPaidAt = format(new Date(), "dd MMMM yyyy, hh:mm a");
    } else {
      formattedPaidAt = format(dateObj, "dd MMMM yyyy, hh:mm a");
    }
  } catch {
    formattedPaidAt = format(new Date(), "dd MMMM yyyy, hh:mm a");
  }

  const cleanDescription = description || "Tuition & Course Academic Fee";
  const cleanPaymentMethod = paymentMethod || "Razorpay Gateway";
  const cleanPaymentId = paymentId || "pay_verified";
  const hasOrderId = Boolean(orderId && orderId !== "N/A" && orderId.trim().length > 0);
  const cleanOrderId = orderId || "";

  const width = 800;
  const height = 1040;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.06" />
      </filter>
    </defs>

    <!-- Outer Background -->
    <rect width="100%" height="100%" fill="#f5f5f4" />

    <!-- Receipt Card -->
    <rect x="30" y="30" width="740" height="980" rx="24" fill="#ffffff" stroke="#e7e5e4" stroke-width="1.5" filter="url(#cardShadow)" />

    <!-- 1. Header Row -->
    <g transform="translate(60, 60)">
      <!-- Official Crafted Logo -->
      <image href="${CRAFTED_LONG_LOGO_BASE64}" x="0" y="0" width="180" height="52" preserveAspectRatio="xMidYMid meet" />

      <!-- Center Title & Receipt Pill -->
      ${renderText(font, "FEE RECEIPT", 340, 22, 14, { weight: "bold", align: "center", letterSpacing: 0.25 })}
      
      <rect x="235" y="32" width="210" height="24" rx="12" fill="#f5f5f4" stroke="#e7e5e4" stroke-width="1" />
      ${renderInlineTexts(font, [
        { text: "Receipt No. ", color: "#78716c", size: 11, weight: "normal" },
        { text: cleanReceiptNum, color: "#1c1917", size: 11.5, weight: "bold" }
      ], 340, 48, { align: "center" })}

      <!-- Paid Stamp Badge -->
      <rect x="595" y="10" width="85" height="30" rx="15" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1" />
      <path d="M610 25 L615 30 L625 19" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${renderText(font, "PAID", 632, 29, 12, { weight: "bold", color: "#047857" })}

      <line x1="0" y1="72" x2="680" y2="72" stroke="#e7e5e4" stroke-width="1" />
    </g>

    <!-- 2. Student & Payment Summary Box (#FFF9F5) -->
    <g transform="translate(60, 145)">
      <rect x="0" y="0" width="680" height="135" rx="16" fill="#FFF9F5" stroke="#FEE8DA" stroke-width="1.2" />

      <!-- Col 1, Row 1: Student Name -->
      <g transform="translate(20, 16)">
        <circle cx="20" cy="20" r="18" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- User Icon -->
        <circle cx="20" cy="15" r="5" fill="none" stroke="#EA580C" stroke-width="1.8" />
        <path d="M12 28 C12 23 16 22 20 22 C24 22 28 23 28 28" fill="none" stroke="#EA580C" stroke-width="1.8" stroke-linecap="round" />
        ${renderText(font, "STUDENT NAME", 50, 14, 10, { weight: "bold", color: "#a8a29e", letterSpacing: 0.1 })}
        ${renderText(font, studentName, 50, 32, 16, { weight: "bold", color: "#1c1917" })}
      </g>

      <!-- Col 2, Row 1: Student ID -->
      <g transform="translate(360, 16)">
        <rect x="2" y="2" width="36" height="36" rx="12" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- Card Icon -->
        <rect x="10" y="12" width="20" height="15" rx="2" fill="none" stroke="#EA580C" stroke-width="1.8" />
        <line x1="10" y1="16" x2="30" y2="16" stroke="#EA580C" stroke-width="1.8" />
        ${renderText(font, "STUDENT ID", 50, 14, 10, { weight: "bold", color: "#a8a29e", letterSpacing: 0.1 })}
        ${renderText(font, studentId, 50, 32, 16, { weight: "bold", color: "#1c1917" })}
      </g>

      <!-- Col 1, Row 2: Class -->
      <g transform="translate(20, 72)">
        <circle cx="20" cy="20" r="18" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- Book Icon -->
        <path d="M12 14 Q20 12 20 26 Q12 28 12 14 M20 26 Q20 12 28 14 Q28 28 20 26" fill="none" stroke="#EA580C" stroke-width="1.8" stroke-linejoin="round" />
        ${renderText(font, "CLASS", 50, 14, 10, { weight: "bold", color: "#a8a29e", letterSpacing: 0.1 })}
        ${renderText(font, cleanClass, 50, 32, 15, { weight: "bold", color: "#1c1917" })}
      </g>

      <!-- Col 2, Row 2: Payment Date -->
      <g transform="translate(360, 72)">
        <circle cx="20" cy="20" r="18" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- Calendar Icon -->
        <rect x="11" y="13" width="18" height="16" rx="3" fill="none" stroke="#EA580C" stroke-width="1.8" />
        <line x1="11" y1="18" x2="29" y2="18" stroke="#EA580C" stroke-width="1.5" />
        ${renderText(font, "PAYMENT DATE", 50, 14, 10, { weight: "bold", color: "#a8a29e", letterSpacing: 0.1 })}
        ${renderText(font, formattedPaidAt, 50, 32, 14.5, { weight: "bold", color: "#1c1917" })}
      </g>
    </g>

    <!-- 3. Particulars Table -->
    <g transform="translate(60, 305)">
      <rect x="0" y="0" width="680" height="165" rx="14" fill="#ffffff" stroke="#e7e5e4" stroke-width="1.2" />

      <!-- Table Header -->
      <path d="M0 14 Q0 0 14 0 L666 0 Q680 0 680 14 L680 40 L0 40 Z" fill="#fafaf9" />
      <line x1="0" y1="40" x2="680" y2="40" stroke="#e7e5e4" stroke-width="1" />
      ${renderText(font, "#", 30, 25, 11, { weight: "bold", color: "#57534e", align: "center" })}
      ${renderText(font, "PARTICULARS / DESCRIPTION", 70, 25, 11, { weight: "bold", color: "#57534e" })}
      ${renderText(font, "AMOUNT (₹)", 650, 25, 11, { weight: "bold", color: "#57534e", align: "right" })}

      <!-- Table Row -->
      ${renderText(font, "1", 30, 72, 13, { weight: "bold", color: "#a8a29e", align: "center" })}
      ${renderText(font, cleanDescription, 70, 72, 15, { weight: "bold", color: "#1c1917" })}
      ${renderText(font, cleanClass, 70, 92, 12, { color: "#78716c" })}
      ${renderText(font, `₹${formattedAmount}`, 650, 76, 16, { weight: "bold", color: "#1c1917", align: "right" })}

      <!-- Total Paid Row -->
      <line x1="0" y1="115" x2="680" y2="115" stroke="#FEE8DA" stroke-width="1" />
      <path d="M0 115 L680 115 L680 151 Q680 165 666 165 L14 165 Q0 165 0 151 Z" fill="#FFF9F5" />
      ${renderText(font, "Total Paid", 480, 143, 14, { weight: "bold", color: "#292524", align: "right" })}
      ${renderText(font, `₹${formattedAmount}`, 650, 144, 22, { weight: "black", color: "#EA580C", align: "right" })}
    </g>

    <!-- 4. Payment Successful Box (#ECFDF5) -->
    <g transform="translate(60, 495)">
      <rect x="0" y="0" width="680" height="85" rx="16" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.2" />
      <circle cx="35" cy="42" r="16" fill="#10B981" />
      <path d="M28 42 L33 47 L42 37" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      ${renderText(font, "Payment Successful", 65, 38, 15, { weight: "bold", color: "#065F46" })}
      ${renderText(font, `Verified via ${cleanPaymentMethod}`, 65, 56, 11.5, { weight: "bold", color: "#047857" })}

      ${
        hasOrderId
          ? `
      ${renderInlineTexts(font, [
        { text: "Payment ID: ", color: "#6b7280", size: 11, weight: "normal" },
        { text: cleanPaymentId, color: "#1c1917", size: 12, weight: "bold" }
      ], 650, 34, { align: "right" })}
      ${renderInlineTexts(font, [
        { text: "Order Ref: ", color: "#6b7280", size: 11, weight: "normal" },
        { text: cleanOrderId, color: "#374151", size: 12, weight: "normal" }
      ], 650, 52, { align: "right" })}
          `
          : `
      ${renderInlineTexts(font, [
        { text: "Payment ID: ", color: "#6b7280", size: 11, weight: "normal" },
        { text: cleanPaymentId, color: "#1c1917", size: 12, weight: "bold" }
      ], 650, 44, { align: "right" })}
          `
      }
    </g>

    <!-- 5. Thank You Note -->
    <g transform="translate(60, 608)">
      <image href="${THANK_YOU_SCRIPT_BASE64}" x="-2" y="0" width="180" height="42" preserveAspectRatio="xMidYMid meet" />
      ${renderText(font, "We appreciate your trust in Crafted Learning Hub. Keep learning and growing with us.", 0, 58, 13, { color: "#57534e" })}
      <line x1="0" y1="85" x2="680" y2="85" stroke="#e7e5e4" stroke-width="1" />
    </g>

    <!-- 6. Footer Section -->
    <g transform="translate(60, 720)">
      <!-- Email Row -->
      <g transform="translate(180, 0)">
        <circle cx="15" cy="15" r="13" fill="#FFEDD5" />
        <!-- Mail Icon -->
        <rect x="7" y="9" width="16" height="12" rx="2" fill="none" stroke="#EA580C" stroke-width="1.5" />
        <path d="M7 10 L15 16 L23 10" fill="none" stroke="#EA580C" stroke-width="1.5" />
        ${renderInlineTexts(font, [
          { text: "EMAIL: ", color: "#a8a29e", size: 11, weight: "bold" },
          { text: "accounts@craftedlearn.com", color: "#1c1917", size: 13, weight: "bold" }
        ], 38, 19, { align: "left" })}
      </g>

      <!-- Phone & Website Row -->
      <line x1="0" y1="45" x2="680" y2="45" stroke="#e7e5e4" stroke-width="1" />

      <g transform="translate(70, 60)">
        <circle cx="16" cy="16" r="14" fill="#FFEDD5" />
        <!-- Phone Icon -->
        <path d="M11 11 C11 19 19 23 23 20 L20 17 L17 19 C15 17 14 16 13 14 L15 12 Z" fill="#EA580C" />
        ${renderText(font, "PHONE", 40, 12, 9, { weight: "bold", color: "#a8a29e" })}
        ${renderText(font, "+91 7356 324 680", 40, 26, 13, { weight: "bold", color: "#1c1917" })}
      </g>

      <line x1="340" y1="55" x2="340" y2="95" stroke="#e7e5e4" stroke-width="1" />

      <g transform="translate(420, 60)">
        <circle cx="16" cy="16" r="14" fill="#FFEDD5" />
        <image href="${CRAFTED_ICON_BASE64}" x="6" y="6" width="20" height="20" />
        ${renderText(font, "WEBSITE", 42, 12, 9, { weight: "bold", color: "#a8a29e" })}
        ${renderText(font, "craftedlearn.com", 42, 26, 13, { weight: "bold", color: "#1c1917" })}
      </g>

      <!-- Bottom Tagline -->
      <line x1="0" y1="115" x2="680" y2="115" stroke="#e7e5e4" stroke-width="0.8" />
      ${renderText(font, "CRAFTED LEARNING HUB", 340, 135, 11, { weight: "bold", color: "#EA580C", align: "center", letterSpacing: 0.2 })}
      ${renderText(font, "LEARN FROM THE PEOPLE WHO\u0027VE BEEN THERE AND DONE IT", 340, 150, 9, { weight: "bold", color: "#a8a29e", align: "center", letterSpacing: 0.15 })}
    </g>
  </svg>
  `.trim();

  // Convert vector SVG to ultra-sharp 300 DPI PNG buffer
  const pngBuf = await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();

  // Wrap inside jsPDF matching exact proportions
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [width, height],
  });

  doc.addImage(pngBuf, "PNG", 0, 0, width, height, undefined, "FAST");

  return Buffer.from(doc.output("arraybuffer"));
}
