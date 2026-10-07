import type { Metadata } from "next";
import { loadImagesPage } from "@/lib/caption-actions";
import ImageFeed from "../_components/image-feed";

export const metadata: Metadata = {
  title: "Images — Linxi Jiang",
};

export default async function ImagesPage() {
  const initial = await loadImagesPage(0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">Images</h1>
      <ImageFeed initial={initial} fetchPage={loadImagesPage} />
    </main>
  );
}
