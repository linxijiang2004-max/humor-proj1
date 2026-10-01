"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700";

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">First name</span>
        <input name="first_name" defaultValue={profile?.first_name ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Last name</span>
        <input name="last_name" defaultValue={profile?.last_name ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Profile photo</span>
        <input
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm"
        />
        <span className="text-xs text-gray-500">PNG, JPEG, WebP or GIF, up to 5 MB.</span>
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
