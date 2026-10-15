import sharp from "sharp";
import { jsPDF } from "jspdf";
import { formatClassOnly } from "./utils";
import { format } from "date-fns";
import {
  CRAFTED_LONG_LOGO_BASE64,
  CRAFTED_ICON_BASE64,
  THANK_YOU_SCRIPT_BASE64,
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

function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe == null) return "";
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function formatCurrency(amt: number): string {
  return amt.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates a 100% pixel-perfect PDF fee receipt matching the portal's PaymentReceiptModal.
 * Embeds official high-DPI branding, crisp Lucide-style vector badges, Indian Rupee symbols (₹),
 * and verified status banners. Runs in pure Node.js / Vercel Serverless.
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

  const width = 800;
  const height = 1040;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
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
      <text x="340" y="22" font-size="14" font-weight="800" fill="#292524" letter-spacing="3.5" text-anchor="middle">FEE RECEIPT</text>
      
      <rect x="235" y="32" width="210" height="24" rx="12" fill="#f5f5f4" stroke="#e7e5e4" stroke-width="1" />
      <text x="340" y="48" font-size="11" text-anchor="middle">
        <tspan fill="#78716c" font-weight="600">Receipt No. </tspan>
        <tspan fill="#1c1917" font-weight="800" font-family="monospace">${escapeXml(cleanReceiptNum)}</tspan>
      </text>

      <!-- Paid Stamp Badge -->
      <rect x="595" y="10" width="85" height="30" rx="15" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1" />
      <path d="M610 25 L615 30 L625 19" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <text x="632" y="29" font-size="12" font-weight="800" fill="#047857" letter-spacing="0.5">PAID</text>

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
        <text x="50" y="14" font-size="10" font-weight="700" fill="#a8a29e" letter-spacing="1">STUDENT NAME</text>
        <text x="50" y="32" font-size="16" font-weight="800" fill="#1c1917">${escapeXml(studentName)}</text>
      </g>

      <!-- Col 2, Row 1: Student ID -->
      <g transform="translate(360, 16)">
        <rect x="2" y="2" width="36" height="36" rx="12" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- Card Icon -->
        <rect x="10" y="12" width="20" height="15" rx="2" fill="none" stroke="#EA580C" stroke-width="1.8" />
        <line x1="10" y1="16" x2="30" y2="16" stroke="#EA580C" stroke-width="1.8" />
        <text x="50" y="14" font-size="10" font-weight="700" fill="#a8a29e" letter-spacing="1">STUDENT ID</text>
        <text x="50" y="32" font-size="16" font-weight="800" font-family="monospace" fill="#1c1917">${escapeXml(studentId)}</text>
      </g>

      <!-- Col 1, Row 2: Class -->
      <g transform="translate(20, 72)">
        <circle cx="20" cy="20" r="18" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- Book Icon -->
        <path d="M12 14 Q20 12 20 26 Q12 28 12 14 M20 26 Q20 12 28 14 Q28 28 20 26" fill="none" stroke="#EA580C" stroke-width="1.8" stroke-linejoin="round" />
        <text x="50" y="14" font-size="10" font-weight="700" fill="#a8a29e" letter-spacing="1">CLASS</text>
        <text x="50" y="32" font-size="15" font-weight="800" fill="#1c1917">${escapeXml(cleanClass)}</text>
      </g>

      <!-- Col 2, Row 2: Payment Date -->
      <g transform="translate(360, 72)">
        <circle cx="20" cy="20" r="18" fill="#FFEDD5" stroke="#FED7AA" stroke-width="1" />
        <!-- Calendar Icon -->
        <rect x="11" y="13" width="18" height="16" rx="3" fill="none" stroke="#EA580C" stroke-width="1.8" />
        <line x1="11" y1="18" x2="29" y2="18" stroke="#EA580C" stroke-width="1.5" />
        <text x="50" y="14" font-size="10" font-weight="700" fill="#a8a29e" letter-spacing="1">PAYMENT DATE</text>
        <text x="50" y="32" font-size="14.5" font-weight="700" fill="#1c1917">${escapeXml(formattedPaidAt)}</text>
      </g>
    </g>

    <!-- 3. Particulars Table -->
    <g transform="translate(60, 305)">
      <rect x="0" y="0" width="680" height="165" rx="14" fill="#ffffff" stroke="#e7e5e4" stroke-width="1.2" />

      <!-- Table Header -->
      <path d="M0 14 Q0 0 14 0 L666 0 Q680 0 680 14 L680 40 L0 40 Z" fill="#fafaf9" />
      <line x1="0" y1="40" x2="680" y2="40" stroke="#e7e5e4" stroke-width="1" />
      <text x="30" y="25" font-size="11" font-weight="700" fill="#57534e" text-anchor="middle">#</text>
      <text x="70" y="25" font-size="11" font-weight="700" fill="#57534e">PARTICULARS / DESCRIPTION</text>
      <text x="650" y="25" font-size="11" font-weight="700" fill="#57534e" text-anchor="end">AMOUNT (₹)</text>

      <!-- Table Row -->
      <text x="30" y="72" font-size="13" font-weight="600" fill="#a8a29e" text-anchor="middle">1</text>
      <text x="70" y="72" font-size="15" font-weight="700" fill="#1c1917">${escapeXml(cleanDescription)}</text>
      <text x="70" y="92" font-size="12" font-weight="500" fill="#78716c">${escapeXml(cleanClass)}</text>
      <text x="650" y="76" font-size="16" font-weight="700" fill="#1c1917" text-anchor="end">₹${escapeXml(formattedAmount)}</text>

      <!-- Total Paid Row -->
      <line x1="0" y1="115" x2="680" y2="115" stroke="#FEE8DA" stroke-width="1" />
      <path d="M0 115 L680 115 L680 151 Q680 165 666 165 L14 165 Q0 165 0 151 Z" fill="#FFF9F5" />
      <text x="480" y="143" font-size="14" font-weight="800" fill="#292524" text-anchor="end">Total Paid</text>
      <text x="650" y="144" font-size="22" font-weight="900" fill="#EA580C" text-anchor="end">₹${escapeXml(formattedAmount)}</text>
    </g>

    <!-- 4. Payment Successful Box (#ECFDF5) -->
    <g transform="translate(60, 495)">
      <rect x="0" y="0" width="680" height="85" rx="16" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.2" />
      <circle cx="35" cy="42" r="16" fill="#10B981" />
      <path d="M28 42 L33 47 L42 37" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      <text x="65" y="38" font-size="15" font-weight="800" fill="#065F46">Payment Successful</text>
      <text x="65" y="56" font-size="11.5" font-weight="600" fill="#047857">Verified via ${escapeXml(cleanPaymentMethod)}</text>

      ${
        hasOrderId
          ? `
      <text x="650" y="34" font-size="12" font-weight="700" font-family="monospace" fill="#1c1917" text-anchor="end">
        <tspan fill="#6b7280" font-family="sans-serif" font-weight="500" font-size="11">Payment ID: </tspan>${escapeXml(cleanPaymentId)}
      </text>
      <text x="650" y="52" font-size="12" font-weight="500" font-family="monospace" fill="#374151" text-anchor="end">
        <tspan fill="#6b7280" font-family="sans-serif" font-weight="500" font-size="11">Order Ref: </tspan>${escapeXml(orderId)}
      </text>
      `
          : `
      <text x="650" y="44" font-size="12" font-weight="700" font-family="monospace" fill="#1c1917" text-anchor="end">
        <tspan fill="#6b7280" font-family="sans-serif" font-weight="500" font-size="11">Payment ID: </tspan>${escapeXml(cleanPaymentId)}
      </text>
      `
      }
    </g>

    <!-- 5. Thank You Note -->
    <g transform="translate(60, 608)">
      <image href="${THANK_YOU_SCRIPT_BASE64}" x="-2" y="0" width="180" height="42" preserveAspectRatio="xMidYMid meet" />
      <text x="0" y="58" font-size="13" fill="#57534e">We appreciate your trust in Crafted Learning Hub. Keep learning and growing with us.</text>
      <line x1="0" y1="85" x2="680" y2="85" stroke="#e7e5e4" stroke-width="1" />
    </g>

    <!-- 6. Footer Section -->
    <g transform="translate(60, 720)">
      <!-- Email Row -->
      <g transform="translate(210, 0)">
        <circle cx="15" cy="15" r="13" fill="#FFEDD5" />
        <!-- Mail Icon -->
        <rect x="7" y="9" width="16" height="12" rx="2" fill="none" stroke="#EA580C" stroke-width="1.5" />
        <path d="M7 10 L15 16 L23 10" fill="none" stroke="#EA580C" stroke-width="1.5" />
        <text x="38" y="19" font-size="11" font-weight="700" fill="#a8a29e">EMAIL: <tspan fill="#1c1917" font-size="13" font-weight="700">accounts@craftedlearn.com</tspan></text>
      </g>

      <!-- Phone & Website Row -->
      <line x1="0" y1="45" x2="680" y2="45" stroke="#e7e5e4" stroke-width="1" />

      <g transform="translate(70, 60)">
        <circle cx="16" cy="16" r="14" fill="#FFEDD5" />
        <!-- Phone Icon -->
        <path d="M11 11 C11 19 19 23 23 20 L20 17 L17 19 C15 17 14 16 13 14 L15 12 Z" fill="#EA580C" />
        <text x="40" y="12" font-size="9" font-weight="700" fill="#a8a29e">PHONE</text>
        <text x="40" y="26" font-size="13" font-weight="700" fill="#1c1917">+91 7356 324 680</text>
      </g>

      <line x1="340" y1="55" x2="340" y2="95" stroke="#e7e5e4" stroke-width="1" />

      <g transform="translate(420, 60)">
        <circle cx="16" cy="16" r="14" fill="#FFEDD5" />
        <image href="${CRAFTED_ICON_BASE64}" x="6" y="6" width="20" height="20" />
        <text x="42" y="12" font-size="9" font-weight="700" fill="#a8a29e">WEBSITE</text>
        <text x="42" y="26" font-size="13" font-weight="700" fill="#1c1917">craftedlearn.com</text>
      </g>

      <!-- Bottom Tagline -->
      <line x1="0" y1="115" x2="680" y2="115" stroke="#e7e5e4" stroke-width="0.8" />
      <text x="340" y="135" font-size="11" font-weight="800" fill="#EA580C" letter-spacing="2" text-anchor="middle">CRAFTED LEARNING HUB</text>
      <text x="340" y="150" font-size="9" font-weight="700" fill="#a8a29e" letter-spacing="1.5" text-anchor="middle">LEARN FROM THE PEOPLE WHO'VE BEEN THERE AND DONE IT</text>
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
