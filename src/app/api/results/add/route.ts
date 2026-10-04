import { NextRequest } from "next/server";
import { POST as handlePost } from "../route";

export async function POST(req: NextRequest) {
  return handlePost(req);
}
