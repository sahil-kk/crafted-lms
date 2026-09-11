import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Payment } from "@/models/Payment";

// PUT update payment (requires admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const { status, paidAt, amount, dueDate } = await req.json();

    const updated = await Payment.findByIdAndUpdate(
      id,
      {
        ...(status && { status }),
        ...(paidAt !== undefined && { paidAt: paidAt ? new Date(paidAt) : null }),
        ...(amount !== undefined && { amount }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE payment (requires admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(req, ["admin"]);
    if (authResult.error) return authResult.error;

    await connectDB();
    const { id } = await params;
    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
