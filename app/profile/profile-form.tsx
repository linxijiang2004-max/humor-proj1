"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { ALLOWED_AVATAR_TYPES, validateAvatar } from "@/lib/avatar";
import type { Profile } from "@/lib/supabase/server";
import { updateProfile, type FormState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700";

export default function ProfileForm({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string | null;
}) {
  // Object URL for the chosen-but-not-yet-saved photo.
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [state, action, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await updateProfile(prev, formData);
      // React resets the form (including the file input) after every
      // submit, so drop the preview too: on success the saved photo shows,
      // on error the user picks the file again.
      setPreview(null);
      return result;
    },
    undefined,
  );

  // Free the previous preview's memory whenever it is replaced or unmounted.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const invalid = validateAvatar(file);
    if (invalid) {
      setFileError(invalid);
      setPreview(null);
      event.target.value = ""; // so the bad file isn't submitted
      return;
    }

    setFileError(null);
    setPreview(URL.createObjectURL(file));
  }

  const imageSrc = preview ?? profile?.avatar_url;
  const initial = (profile?.first_name?.[0] ?? email?.[0] ?? "?").toUpperCase();
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="mb-4 flex items-center gap-5">
        {/* The whole avatar is the upload control; the real input is hidden
            but still focusable, so keyboard users can open the picker. */}
        <label
          className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2"
          title="Change photo"
        >
          <input
            type="file"
            name="avatar"
            accept={ALLOWED_AVATAR_TYPES.join(",")}
            onChange={onFileChange}
            className="sr-only"
            aria-label="Change profile photo"
          />
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc} alt="Your profile photo" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gray-200 text-3xl text-gray-500 dark:bg-gray-800">
              {initial}
            </span>
          )}
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Change photo
          </span>
        </label>

        <div className="min-w-0">
          <p className="truncate font-medium">{fullName || "No name yet"}</p>
          <p className="truncate text-sm text-gray-500">{email}</p>
          <p className="mt-1 text-xs text-gray-500">
            {preview
              ? "New photo selected. Save to apply it."
              : "Click the photo to change it. PNG, JPEG, WebP or GIF, up to 5 MB."}
          </p>
        </div>
      </div>

      {fileError && <p className="text-sm text-red-600">{fileError}</p>}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">First name</span>
        <input name="first_name" defaultValue={profile?.first_name ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Last name</span>
        <input name="last_name" defaultValue={profile?.last_name ?? ""} className={inputClass} />
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
