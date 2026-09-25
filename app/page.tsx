import Link from "next/link";

export default function Home() {
  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Hello World</h1>
      <Link href="/captions" className="mt-4 inline-block text-blue-600 underline">
        View captions →
      </Link>
    </main>
  );
}
