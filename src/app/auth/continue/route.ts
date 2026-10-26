import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { homeFor, safeNext } from "@/lib/roles";

// Role router: admin/superadmin/media -> /dashboard, user -> /feed.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const target = safeNext(request.nextUrl.searchParams.get("next")) ?? homeFor(user.role);
  return NextResponse.redirect(new URL(target, request.url));
}
