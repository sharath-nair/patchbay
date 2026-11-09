import { Suspense } from "react";
import { Editor } from "@/components/canvas/Editor";

async function EditorContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Editor id={id} />;
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-8">Loading…</p>}>
      <EditorContent params={params} />
    </Suspense>
  );
}
