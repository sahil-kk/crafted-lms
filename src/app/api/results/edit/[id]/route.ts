import { NextRequest } from "next/server";
import { PUT as handlePut } from "../../[id]/route";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return handlePut(req, ctx);
}

export const PATCH = PUT;
