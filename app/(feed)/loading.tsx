import SkeletonFeed from "../_components/skeleton-feed";

// Same frame as the page, with the toolbar row held open so nothing jumps
// when the feed arrives.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 py-4">
      <div className="mb-4 min-h-8" />
      <SkeletonFeed />
    </main>
  );
}
