import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Workflows</h1>
      <p className="text-muted-foreground mt-2">Saved workflows will appear here.</p>
      <Link href="/editor/demo" className="mt-4 inline-block underline underline-offset-4">
        Open demo workflow
      </Link>
    </main>
  );
}
