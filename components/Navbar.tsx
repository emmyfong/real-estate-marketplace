import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="h-14 border-b border-gray-200 bg-white">
      <nav className="mx-auto grid h-full max-w-7xl grid-cols-3 items-center px-4">
        <div className="text-sm font-medium text-gray-500">
          <span className="hidden sm:inline">Metro Vancouver</span>
        </div>

        <Link href="/" className="flex items-center justify-center gap-2">
          <Image src="/logo.jpeg" alt="Property Copilot" width={28} height={28} className="rounded-md" priority />
          <span className="text-lg font-bold tracking-tight text-brand-navy">Property Copilot</span>
        </Link>

        <div className="flex justify-end">
          <Link
            href="/browse"
            className="rounded-full bg-brand-navy px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-navy/90"
          >
            Browse rentals
          </Link>
        </div>
      </nav>
    </header>
  );
}
