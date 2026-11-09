import { Suspense } from "react";

async function EditorContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <h1 className="text-2xl font-semibold">Editor</h1>
      <p className="text-muted-foreground mt-2">Workflow: {id}</p>
    </>
  );
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="p-8">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <EditorContent params={params} />
      </Suspense>
    </main>
  );
}
