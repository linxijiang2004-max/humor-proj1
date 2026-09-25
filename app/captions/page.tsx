import type { Metadata } from "next";
import { connection } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Captions — Linxi Jiang",
};

type CaptionRow = {
  id: number;
  content: string;
  created_at: string;
  images: { id: number; url: string } | null;
};

export default async function CaptionsPage() {
  // Render on every request so new rows show up without a redeploy.
  // Without this, the query would run once during `next build`.
  await connection();

  const { data, error } = await getSupabase()
    .from("captions")
    .select("id, content, created_at, images(id, url)")
    .order("created_at", { ascending: false })
    .overrideTypes<CaptionRow[], { merge: false }>();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Captions</h1>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
          Failed to load captions: {error.message}
        </p>
      ) : data.length === 0 ? (
        <p className="text-gray-500">No captions yet.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((caption) => (
            <li
              key={caption.id}
              className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
            >
              {caption.images && (
                // Image URLs can come from any host, so a plain <img> avoids
                // having to list every domain in next.config.ts.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={caption.images.url}
                  alt={caption.content}
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="p-4">
                <p>{caption.content}</p>
                <p className="mt-2 text-sm text-gray-500">
                  {new Date(caption.created_at).toLocaleString("en-US")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
