import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-brand-navy">
        Find your next rental in Metro Vancouver
      </h1>
      <p className="mx-auto max-w-xl text-gray-600">
        Browse listings on an interactive map, filter by price, beds, baths, and type,
        and keep the map and list in sync as you explore.
      </p>
      <Link
        href="/browse"
        className="inline-block rounded-full bg-brand-navy px-6 py-3 font-medium text-white transition hover:bg-brand-navy/90"
      >
        Browse rentals
      </Link>
    </section>
  );
}
