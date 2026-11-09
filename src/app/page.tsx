import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Patchbay</h1>
      <p className="text-muted-foreground">
        A node-based AI workflow builder. Wire up triggers, prompts, and routers, then watch the data flow.
      </p>
      <Link href="/dashboard" className="underline underline-offset-4">
        Open dashboard
      </Link>
    </main>
  );
}
