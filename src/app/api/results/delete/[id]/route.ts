import { NextRequest } from "next/server";
import { DELETE as handleDelete } from "../../[id]/route";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return handleDelete(req, ctx);
}
