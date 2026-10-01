import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Hello World</h1>
      <Link href="/captions" className="mt-4 inline-block text-blue-600 underline">
        View captions →
      </Link>
      <p className="mt-6 text-gray-500">
        {user ? (
          <Link href="/dashboard" className="text-blue-600 underline">
            Go to your dashboard →
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-blue-600 underline">
              Sign in with Google
            </Link>{" "}
            to see the members-only dashboard.
          </>
        )}
      </p>
    </main>
  );
}
