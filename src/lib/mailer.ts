import nodemailer from "nodemailer";

const ACCOUNTS_EMAIL = "accounts@craftedlearn.com";

/**
 * Creates nodemailer transporter using available environment variables.
 * Supports SMTP_HOST / SMTP_USER / SMTP_PASS or GMAIL_USER / GMAIL_APP_PASSWORD.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    if (host) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    // Default to Gmail service if user/pass provided without explicit host
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return null;
}

export function formatClassOnly(grade?: string): string {
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
}

/**
 * Sends an official payment confirmation notification to Crafted accounts email (accounts@craftedlearn.com).
 */
export async function sendPaymentNotificationToAccounts(details: {
  studentName: string;
  studentId: string;
  amount: number;
  receiptNumber?: string;
  paymentId?: string;
  orderId?: string;
  classGrade?: string;
  paymentMethod?: string;
  paidAt?: Date;
  description?: string;
}) {
  const {
    studentName,
    studentId,
    amount,
    receiptNumber = "Pending",
    paymentId = "N/A",
    orderId = "N/A",
    classGrade,
    paymentMethod = "Online (Razorpay)",
    paidAt = new Date(),
    description = "Tuition & Course Academic Fee",
  } = details;

  const formattedDate = new Date(paidAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cleanClass = formatClassOnly(classGrade);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; color: #111827; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #f97316; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; }
        .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 24px; }
        .amount-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px; }
        .amount-box .label { font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        .amount-box .value { font-size: 28px; font-weight: 900; color: #065f46; margin: 4px 0 0; }
        .table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .table td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .table td:first-child { color: #6b7280; font-weight: 500; width: 40%; }
        .table td:last-child { font-weight: 700; color: #111827; text-align: right; }
        .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>CRAFTED LEARNING HUB</h1>
          <p>Payment Received Notification</p>
        </div>
        <div class="content">
          <div class="amount-box">
            <p class="label">Amount Successfully Received</p>
            <p class="value">₹${amount.toLocaleString("en-IN")}.00</p>
          </div>
          <table class="table">
            <tr>
              <td>Student Name</td>
              <td>${studentName}</td>
            </tr>
            <tr>
              <td>Student ID</td>
              <td>${studentId}</td>
            </tr>
            <tr>
              <td>Class</td>
              <td>${cleanClass}</td>
            </tr>
            <tr>
              <td>Particulars</td>
              <td>${description}</td>
            </tr>
            <tr>
              <td>Receipt Number</td>
              <td>${receiptNumber}</td>
            </tr>
            <tr>
              <td>Payment ID</td>
              <td>${paymentId}</td>
            </tr>
            <tr>
              <td>Order Ref</td>
              <td>${orderId}</td>
            </tr>
            <tr>
              <td>Payment Method</td>
              <td>${paymentMethod}</td>
            </tr>
            <tr>
              <td>Date & Time</td>
              <td>${formattedDate} IST</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          This is an automated notification from Crafted LMS ERP.<br/>
          Crafted Learning Hub &bull; craftedlearn.com &bull; +91 7356 324 680
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`[PAYMENT NOTIFICATION] To: ${ACCOUNTS_EMAIL} | Student: ${studentName} (${studentId}) | Amount: ₹${amount}`);

  try {
    const transporter = getTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"Crafted LMS Payments" <${process.env.SMTP_USER || "no-reply@craftedlearn.com"}>`,
        to: ACCOUNTS_EMAIL,
        subject: `Payment Received: ₹${amount} - ${studentName} (${cleanClass} / ${studentId})`,
        html: htmlContent,
      });
      console.log(`[PAYMENT NOTIFICATION] Email sent successfully to ${ACCOUNTS_EMAIL}`);
      return { success: true };
    } else {
      console.log(`[PAYMENT NOTIFICATION] SMTP credentials not set. Notification recorded in application logs.`);
      return { success: true, simulated: true };
    }
  } catch (err: any) {
    console.error(`[PAYMENT NOTIFICATION ERROR] Failed to send email to ${ACCOUNTS_EMAIL}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a payment reminder email to student and linked parent.
 */
export async function sendPaymentReminderEmail(details: {
  recipientEmail: string;
  studentName: string;
  amount: number;
  dueDate: string | Date;
  classGrade?: string;
  description?: string;
}) {
  const {
    recipientEmail,
    studentName,
    amount,
    dueDate,
    classGrade,
    description = "Tuition & Course Academic Fee",
  } = details;

  const formattedDueDate = new Date(dueDate).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
  const cleanClass = formatClassOnly(classGrade);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; color: #111827; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #f97316; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 24px; font-size: 14px; line-height: 1.6; }
        .due-box { background: #fff7ed; border: 1px solid #ffedd5; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center; }
        .due-box .amt { font-size: 26px; font-weight: 900; color: #c2410c; margin: 0; }
        .btn-container { text-align: center; margin: 24px 0; }
        .btn { background: #ea580c; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; display: inline-block; }
        .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>CRAFTED LEARNING HUB</h1>
          <p>Fee Payment Reminder</p>
        </div>
        <div class="content">
          <p>Dear <strong>${studentName}</strong> (or Parent/Guardian),</p>
          <p>This is a gentle reminder regarding your pending fee payment for <strong>${cleanClass}</strong>.</p>
          <div class="due-box">
            <p style="margin: 0; font-size: 12px; color: #9a3412; font-weight: 600; text-transform: uppercase;">Amount Due</p>
            <p class="amt">₹${amount.toLocaleString("en-IN")}.00</p>
            <p style="margin: 6px 0 0; font-size: 12px; color: #7c2d12;">Due Date: <strong>${formattedDueDate}</strong> &bull; ${description}</p>
          </div>
          <p>Please log in to your Crafted LMS portal to complete the payment securely online via Razorpay or UPI.</p>
          <div class="btn-container">
            <a href="https://craftedlearn.com/dashboard/payments" class="btn">View & Pay Invoice</a>
          </div>
          <p style="font-size: 12px; color: #6b7280;">If you have already processed this payment, kindly disregard this notice.</p>
        </div>
        <div class="footer">
          Crafted Learning Hub &bull; accounts@craftedlearn.com &bull; +91 7356 324 680<br/>
          craftedlearn.com
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`[PAYMENT REMINDER] To: ${recipientEmail} | Student: ${studentName} | Amount: ₹${amount}`);

  try {
    const transporter = getTransporter();
    if (transporter && recipientEmail) {
      await transporter.sendMail({
        from: `"Crafted Learning Hub" <${process.env.SMTP_USER || "accounts@craftedlearn.com"}>`,
        to: recipientEmail,
        subject: `Fee Payment Reminder: ₹${amount} Due for ${cleanClass}`,
        html: htmlContent,
      });
      console.log(`[PAYMENT REMINDER] Sent to ${recipientEmail}`);
      return { success: true };
    } else {
      console.log(`[PAYMENT REMINDER] Transporter not active. Simulated reminder logged.`);
      return { success: true, simulated: true };
    }
  } catch (err: any) {
    console.error(`[PAYMENT REMINDER ERROR] Failed to send to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}
