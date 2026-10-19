import SkeletonFeed from "../_components/skeleton-feed";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">mine</h1>
      <SkeletonFeed />
    </main>
  );
}
