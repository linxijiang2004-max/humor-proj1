import { NextResponse, type NextRequest } from "next/server";
import { createClient, getUserAndProfile, hasFullName } from "@/lib/supabase/server";

// Google sends the user back here with ?code=..., which we trade for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { profile } = await getUserAndProfile();
      const next = hasFullName(profile) ? "/" : "/onboarding";
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
