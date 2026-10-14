import { Resend } from "resend";
import { formatClassOnly } from "./mailer";
import { generateFeeReceiptPdf } from "./pdfReceipt";

export function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  return apiKey ? new Resend(apiKey) : null;
}

export const resend = getResendClient();

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Crafted Learning Hub <accounts@craftedlearn.com>";

export const DEFAULT_REPLY_TO =
  process.env.RESEND_REPLY_TO || "craftedlearninghub@gmail.com";

export const ACCOUNTS_EMAIL = "craftedlearninghub@gmail.com";

export interface FeeReceiptEmailDetails {
  studentName: string;
  studentId: string;
  recipientEmail: string;
  parentEmail?: string;
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
 * Formats amount into Indian currency format (e.g. 4,500.00).
 */
function formatAmount(amt: number): string {
  return amt.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates an email-safe, responsive HTML template identical to the portal's PaymentReceiptModal.
 */
export function generateReceiptEmailHtml(details: FeeReceiptEmailDetails): string {
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
  const formattedAmount = formatAmount(amount);
  const portalUrl = "https://craftedlearn.com/dashboard/payments";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Receipt - ${receiptNumber}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f5f5f4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1c1917;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f5f5f4;
      padding: 24px 12px;
    }
    .receipt-card {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e7e5e4;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .inner-padding {
      padding: 28px 24px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #e7e5e4;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .summary-box {
      background-color: #FFF9F5;
      border: 1px solid #FEE8DA;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-cell {
      width: 50%;
      padding: 6px 8px;
      vertical-align: top;
    }
    .label {
      font-size: 9px;
      font-weight: 700;
      color: #a8a29e;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 2px 0;
    }
    .val-main {
      font-size: 14px;
      font-weight: 700;
      color: #1c1917;
      margin: 0;
    }
    .val-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 700;
      color: #1c1917;
      margin: 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .items-table th {
      background-color: #fafaf9;
      padding: 10px 14px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #57534e;
      border-bottom: 1px solid #e7e5e4;
    }
    .items-table td {
      padding: 12px 14px;
      font-size: 13px;
      border-bottom: 1px solid #f5f5f4;
    }
    .total-row {
      background-color: #FFF9F5;
      border-top: 1px solid #FEE8DA;
    }
    .total-row td {
      padding: 14px;
    }
    .total-amount {
      font-size: 20px;
      font-weight: 900;
      color: #EA580C;
    }
    .verify-box {
      background-color: #ECFDF5;
      border: 1px solid #A7F3D0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 22px;
    }
    .verify-table {
      width: 100%;
      border-collapse: collapse;
    }
    .btn-container {
      text-align: center;
      margin: 22px 0;
    }
    .btn-portal {
      display: inline-block;
      background-color: #EA580C;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      padding: 12px 28px;
      border-radius: 10px;
      letter-spacing: 0.02em;
    }
    .thank-you-box {
      border-top: 1px solid #f5f5f4;
      padding-top: 16px;
      margin-bottom: 20px;
    }
    .footer-section {
      border-top: 1px solid #e7e5e4;
      padding: 18px 24px;
      background-color: #fafaf9;
      font-size: 11px;
      color: #78716c;
      text-align: center;
    }
    .footer-link {
      color: #EA580C;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="receipt-card">
      <div class="inner-padding">

        <!-- HEADER ROW: Logo, Fee Receipt Badge, Paid Stamp -->
        <table class="header-table">
          <tr>
            <td style="width: 33%; vertical-align: middle; text-align: left;">
              <img src="https://craftedlearn.com/craftedlonglogo-with-tm.svg" alt="Crafted Learning Hub" style="height: 38px; max-width: 160px; display: block;" />
            </td>
            <td style="width: 34%; vertical-align: middle; text-align: center;">
              <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.22em; color: #292524; text-transform: uppercase; display: block;">
                FEE RECEIPT
              </span>
              <span style="display: inline-block; margin-top: 4px; padding: 2px 10px; background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 20px; font-size: 10px; font-weight: 700; color: #1c1917; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                ${receiptNumber}
              </span>
            </td>
            <td style="width: 33%; vertical-align: middle; text-align: right;">
              <span style="display: inline-block; padding: 4px 12px; background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 20px; font-size: 11px; font-weight: 800; color: #047857; letter-spacing: 0.04em;">
                &#10003; PAID
              </span>
            </td>
          </tr>
        </table>

        <!-- STUDENT & PAYMENT SUMMARY BOX (MATCHING MODAL #FFF9F5) -->
        <div class="summary-box">
          <table class="summary-table">
            <tr>
              <td class="summary-cell">
                <p class="label">STUDENT NAME</p>
                <p class="val-main">${studentName}</p>
              </td>
              <td class="summary-cell">
                <p class="label">STUDENT ID</p>
                <p class="val-mono">${studentId}</p>
              </td>
            </tr>
            <tr>
              <td class="summary-cell" style="padding-top: 10px;">
                <p class="label">CLASS</p>
                <p class="val-main">${cleanClass}</p>
              </td>
              <td class="summary-cell" style="padding-top: 10px;">
                <p class="label">PAYMENT DATE</p>
                <p class="val-main">${formattedPaidAt}</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- ITEMS BREAKDOWN TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 36px; text-align: center;">#</th>
              <th style="text-align: left;">PARTICULARS / DESCRIPTION</th>
              <th style="text-align: right;">AMOUNT (&#8377;)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; color: #a8a29e; font-weight: 600;">1</td>
              <td>
                <div style="font-weight: 700; color: #1c1917; font-size: 13px;">${description}</div>
                <div style="font-size: 11px; color: #78716c; margin-top: 2px;">${cleanClass} &bull; ${paymentMethod}</div>
              </td>
              <td style="text-align: right; font-weight: 700; color: #1c1917; font-size: 14px;">
                &#8377;${formattedAmount}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" style="text-align: right; font-weight: 800; font-size: 13px; color: #292524;">
                Total Paid
              </td>
              <td style="text-align: right;">
                <span class="total-amount">&#8377;${formattedAmount}</span>
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- PAYMENT SUCCESSFUL VERIFICATION BOX (MATCHING MODAL #ECFDF5) -->
        <div class="verify-box">
          <table class="verify-table">
            <tr>
              <td style="vertical-align: middle;">
                <div style="font-size: 13px; font-weight: 800; color: #065F46;">
                  &#10003; Payment Successful
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #047857; margin-top: 2px;">
                  Verified via ${paymentMethod}
                </div>
              </td>
              <td style="vertical-align: middle; text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #1f2937;">
                <div><span style="color: #6b7280; font-family: sans-serif;">Payment ID:</span> <strong>${paymentId}</strong></div>
                ${orderId !== "N/A" ? `<div style="margin-top: 2px;"><span style="color: #6b7280; font-family: sans-serif;">Order Ref:</span> <span>${orderId}</span></div>` : ""}
              </td>
            </tr>
          </table>
        </div>

        <!-- PORTAL ACTION BUTTON -->
        <div class="btn-container">
          <a href="${portalUrl}" class="btn-portal" target="_blank">
            View &amp; Download Receipt in Portal &rarr;
          </a>
        </div>

        <!-- THANK YOU NOTE (MATCHING MODAL) -->
        <div class="thank-you-box">
          <div style="font-size: 22px; font-weight: 600; color: #1c1917; font-style: italic; font-family: Georgia, serif;">
            Thank You!
          </div>
          <p style="font-size: 12px; color: #57534e; margin: 4px 0 0 0; line-height: 1.5;">
            We appreciate your trust in Crafted Learning Hub. Keep learning and growing with us. This is an official computer-generated fee receipt.
          </p>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="footer-section">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <tr>
            <td style="text-align: center; font-size: 11px; color: #57534e;">
              <strong>Crafted Learning Hub</strong> &bull; Kerala, India<br/>
              Email: <a href="mailto:craftedlearninghub@gmail.com" class="footer-link">craftedlearninghub@gmail.com</a> &bull;
              Phone: <strong>+91 7356 324 680</strong> &bull;
              Website: <a href="https://craftedlearn.com" class="footer-link" target="_blank">craftedlearn.com</a>
            </td>
          </tr>
        </table>
        <p style="margin: 0; font-size: 10px; color: #a8a29e;">
          This email was sent to ${details.recipientEmail} regarding receipt #${receiptNumber}. For support or inquiries, reply directly to this email or contact <a href="mailto:craftedlearninghub@gmail.com" style="color: #ea580c; text-decoration: none;">craftedlearninghub@gmail.com</a>.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends the official fee receipt email via Resend to the student and parent.
 * If RESEND_API_KEY is not configured, logs a simulated send cleanly without throwing.
 */
export async function sendFeeReceiptEmail(details: FeeReceiptEmailDetails): Promise<{
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}> {
  const {
    recipientEmail,
    parentEmail,
    studentName,
    studentId,
    amount,
    receiptNumber = "CRF-RECEIPT",
  } = details;

  // Resolve target email list
  const toList: string[] = [recipientEmail];
  if (parentEmail && parentEmail.toLowerCase() !== recipientEmail.toLowerCase()) {
    toList.push(parentEmail);
  }

  const validRecipients = Array.from(new Set(toList.filter(Boolean)));
  if (validRecipients.length === 0) {
    console.warn(`[FEE RECEIPT] No valid recipient email for student ${studentName} (${studentId}). Skipping email dispatch.`);
    return { success: false, error: "No recipient email provided" };
  }

  const htmlContent = generateReceiptEmailHtml(details);
  const subject = `Fee Receipt: ₹${amount.toLocaleString("en-IN")} - ${studentName} (${receiptNumber})`;

  console.log(`[FEE RECEIPT] Dispatching receipt #${receiptNumber} to ${validRecipients.join(", ")} | Amount: ₹${amount}`);

  // Safe simulation fallback if Resend API key is not present
  const resendClient = getResendClient();
  if (!resendClient) {
    console.log(`[FEE RECEIPT SIMULATION] RESEND_API_KEY is not set. Receipt email #${receiptNumber} logged safely.`);
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}`,
    };
  }

  try {
    // Generate official PDF receipt attachment
    let attachments: any[] | undefined;
    try {
      const pdfBuffer = generateFeeReceiptPdf(details);
      attachments = [
        {
          filename: `Crafted_Fee_Receipt_${receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    } catch (pdfErr) {
      console.error("[FEE RECEIPT PDF GENERATION ERROR]", pdfErr);
    }

    const emailPayload: any = {
      from: DEFAULT_FROM_EMAIL,
      to: validRecipients,
      replyTo: DEFAULT_REPLY_TO,
      subject,
      html: htmlContent,
      attachments,
    };

    if (process.env.RESEND_BCC_ACCOUNTS === "true") {
      emailPayload.bcc = [ACCOUNTS_EMAIL];
    }

    const { data, error } = await resendClient.emails.send(emailPayload);

    if (error) {
      console.error(`[FEE RECEIPT ERROR] Resend returned error for #${receiptNumber}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[FEE RECEIPT SUCCESS] Email sent successfully via Resend. ID: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error(`[FEE RECEIPT EXCEPTION] Failed to dispatch via Resend:`, err.message);
    return { success: false, error: err.message };
  }
}
