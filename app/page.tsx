import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Property Copilot — Map Browser</h1>
      <p className="max-w-2xl text-sm text-gray-700">
        A starting point for a map-based rental browser across Metro Vancouver. The
        backend (AWS) serves 50 seeded listings; your job is the map and filtering
        experience on top of it. See CANDIDATE.md.
      </p>
      <Link
        className="inline-block rounded border px-3 py-2 text-sm hover:border-gray-400"
        href="/browse"
      >
        Browse listings
      </Link>
    </section>
  );
}
