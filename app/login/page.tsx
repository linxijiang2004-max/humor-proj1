import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleSignInButton from "./google-sign-in-button";

export const metadata: Metadata = {
  title: "Sign in — Linxi Jiang",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Sign in</h1>
      <p className="mb-8 text-gray-500">Use your Google account to continue.</p>
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Sign-in failed. Please try again.
        </p>
      )}
      <GoogleSignInButton />
    </main>
  );
}
