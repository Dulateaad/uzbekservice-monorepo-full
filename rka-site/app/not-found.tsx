import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-rka-navy">404</h1>
      <p className="mt-2 text-neutral-600">Page not found.</p>
      <Link
        href="/ru/"
        className="mt-8 rounded-md bg-rka-navy px-4 py-2 text-sm font-semibold text-white hover:bg-rka-navy-mid"
      >
        Рус / Home
      </Link>
    </main>
  );
}
