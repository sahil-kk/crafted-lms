import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = "INR", receipt } = body;

    // Minimum amount: 100 paise (₹1)
    const amountInPaise = Number(amount);
    if (!amountInPaise || isNaN(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json(
        { message: "Amount is required and must be at least 100 paise (₹1.00)" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();
    const orderReceipt = receipt || `rcpt_${Date.now().toString().slice(-10)}`;

    const order = await razorpay.orders.create({
      amount: Math.round(amountInPaise),
      currency: currency.toUpperCase(),
      receipt: orderReceipt.slice(0, 40),
    });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (err: any) {
    console.error("Razorpay /api/create-order error:", err);
    const statusCode = err.statusCode || (err.error && err.error.code === "BAD_REQUEST_ERROR" ? 400 : 500);
    return NextResponse.json(
      { message: err.message || err.description || "Failed to create Razorpay order" },
      { status: statusCode }
    );
  }
}
