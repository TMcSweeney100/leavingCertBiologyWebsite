import type { EntryKind } from "@/lib/api/schemas";
import { KIND_WORD } from "@/lib/app/log";

const TONE: Record<EntryKind, string> = {
  NOTE: "bg-app-kind-note-tint text-app-kind-note",
  SOURCE: "bg-app-kind-source-tint text-app-kind-source",
  AI_USE: "bg-app-kind-ai-tint text-app-kind-ai",
};

/** Pack D-6: the kind is always the word; the pale tint only helps a reader scan a column of them. */
export function LogKindChip({ kind }: { kind: EntryKind }) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded-app-inner px-2 font-mono text-app-label font-bold uppercase tracking-[.06em] ${TONE[kind]}`}>
      {KIND_WORD[kind]}
    </span>
  );
}
