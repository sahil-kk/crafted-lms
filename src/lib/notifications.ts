import { sendPaymentReminderEmail, sendInvoiceCreatedEmail, formatClassOnly } from "./mailer";

/**
 * Normalizes an Indian/international phone number for WhatsApp wa.me links.
 * E.g. "9876543210" -> "919876543210", "+91 98765 43210" -> "919876543210".
 */
export function formatPhoneNumberForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Formats a 1-click WhatsApp deep link (wa.me/{phone}?text={encodedText}).
 * Works out-of-the-box on desktop and mobile without requiring any API keys.
 */
export function formatWhatsAppUrl(phone?: string | null, text: string = ""): string {
  const targetPhone = formatPhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  if (targetPhone) {
    return `https://wa.me/${targetPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export interface InvoiceNotificationData {
  studentName: string;
  studentCode?: string;
  amount: number;
  dueDate: string | Date;
  classGrade?: string;
  description?: string;
  studentPhone?: string;
  studentEmail?: string;
  parentPhone?: string;
  parentEmail?: string;
}

/**
 * Generates Message 1 (Invoice Created):
 * Notification text for WhatsApp when a new fee invoice is generated.
 */
export function formatInvoiceCreatedWhatsApp(data: InvoiceNotificationData): string {
  const formattedDueDate = new Date(data.dueDate).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
  const cleanClass = formatClassOnly(data.classGrade);
  const description = data.description || "Tuition & Academic Course Fee";
  const portalUrl = "https://craftedlearn.com/dashboard/payments";

  return [
    `📚 *CRAFTED LEARNING HUB — NEW INVOICE*`,
    ``,
    `Dear *${data.studentName}* (or Parent/Guardian),`,
    `A new academic fee invoice has been generated for *${cleanClass}*.`,
    ``,
    `📋 *Invoice Particulars:*`,
    `• *Student:* ${data.studentName}${data.studentCode ? ` (${data.studentCode})` : ""}`,
    `• *Class / Course:* ${cleanClass}`,
    `• *Description:* ${description}`,
    `• *Amount Due:* ₹${data.amount.toLocaleString("en-IN")}.00`,
    `• *Due Date:* ${formattedDueDate}`,
    ``,
    `💳 *View & Pay Online:*`,
    `${portalUrl}`,
    ``,
    `For any questions, contact us at +91 7356 324 680 or accounts@craftedlearn.com.`,
  ].join("\n");
}

/**
 * Generates Message 2 (Payment Reminder):
 * Notification text for WhatsApp when admin clicks "Send Reminder".
 */
export function formatPaymentReminderWhatsApp(data: InvoiceNotificationData): string {
  const formattedDueDate = new Date(data.dueDate).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
  const cleanClass = formatClassOnly(data.classGrade);
  const description = data.description || "Tuition & Academic Course Fee";
  const portalUrl = "https://craftedlearn.com/dashboard/payments";

  return [
    `⚠️ *CRAFTED LEARNING HUB — FEE PAYMENT REMINDER*`,
    ``,
    `Dear *${data.studentName}* (or Parent/Guardian),`,
    `This is a gentle reminder that your fee payment for *${cleanClass}* is pending.`,
    ``,
    `📋 *Payment Details:*`,
    `• *Student:* ${data.studentName}${data.studentCode ? ` (${data.studentCode})` : ""}`,
    `• *Class / Course:* ${cleanClass}`,
    `• *Particulars:* ${description}`,
    `• *Amount Due:* ₹${data.amount.toLocaleString("en-IN")}.00`,
    `• *Due Date:* ${formattedDueDate}`,
    ``,
    `💳 *Pay Securely via Portal:*`,
    `${portalUrl}`,
    ``,
    `Kindly disregard if already paid. For support, call +91 7356 324 680.`,
  ].join("\n");
}

/**
 * Triggers Message 1 (Invoice Created Notification):
 * 1. Sends email to student and linked parent (simulated safely if SMTP unset).
 * 2. Formats WhatsApp message and returns a 1-click wa.me URL.
 */
export async function sendInvoiceCreatedNotification(data: InvoiceNotificationData) {
  const whatsappText = formatInvoiceCreatedWhatsApp(data);
  const targetPhone = data.studentPhone || data.parentPhone || "";
  const whatsappUrl = formatWhatsAppUrl(targetPhone, whatsappText);

  let emailSent = false;
  let emailSimulated = true;
  const primaryEmail = data.studentEmail || data.parentEmail;

  if (primaryEmail) {
    try {
      const res = await sendInvoiceCreatedEmail({
        recipientEmail: primaryEmail,
        studentName: data.studentName,
        amount: data.amount,
        dueDate: data.dueDate,
        classGrade: data.classGrade,
        description: data.description,
      });
      emailSent = res.success;
      emailSimulated = Boolean(res.simulated);

      // If parent email is different, send to parent too
      if (data.parentEmail && data.parentEmail !== primaryEmail) {
        sendInvoiceCreatedEmail({
          recipientEmail: data.parentEmail,
          studentName: data.studentName,
          amount: data.amount,
          dueDate: data.dueDate,
          classGrade: data.classGrade,
          description: data.description,
        }).catch(console.error);
      }
    } catch (err) {
      console.warn("Could not dispatch invoice email:", err);
    }
  }

  return {
    success: true,
    emailSent,
    emailSimulated,
    whatsappText,
    whatsappUrl,
    targetPhone,
  };
}

/**
 * Triggers Message 2 (Payment Reminder Notification):
 * 1. Sends reminder email to student and linked parent (simulated safely if SMTP unset).
 * 2. Formats WhatsApp reminder message and returns a 1-click wa.me URL.
 */
export async function sendPaymentReminderNotification(data: InvoiceNotificationData) {
  const whatsappText = formatPaymentReminderWhatsApp(data);
  const targetPhone = data.studentPhone || data.parentPhone || "";
  const whatsappUrl = formatWhatsAppUrl(targetPhone, whatsappText);

  let emailSent = false;
  let emailSimulated = true;
  const primaryEmail = data.studentEmail || data.parentEmail;

  if (primaryEmail) {
    try {
      const res = await sendPaymentReminderEmail({
        recipientEmail: primaryEmail,
        studentName: data.studentName,
        amount: data.amount,
        dueDate: data.dueDate,
        classGrade: data.classGrade,
        description: data.description,
      });
      emailSent = res.success;
      emailSimulated = Boolean(res.simulated);

      if (data.parentEmail && data.parentEmail !== primaryEmail) {
        sendPaymentReminderEmail({
          recipientEmail: data.parentEmail,
          studentName: data.studentName,
          amount: data.amount,
          dueDate: data.dueDate,
          classGrade: data.classGrade,
          description: data.description,
        }).catch(console.error);
      }
    } catch (err) {
      console.warn("Could not dispatch reminder email:", err);
    }
  }

  return {
    success: true,
    emailSent,
    emailSimulated,
    whatsappText,
    whatsappUrl,
    targetPhone,
  };
}
