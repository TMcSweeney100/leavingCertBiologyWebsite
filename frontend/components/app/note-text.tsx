import { noteParts } from "@/lib/app/note-text";

import { textLink } from "./styles";

/** A teacher's note as written: line breaks kept, http(s) links opening in a new tab (S-26). */
export function NoteText({ text }: { text: string }) {
  return (
    <p className="text-app-base break-words whitespace-pre-wrap text-app-ink">
      {noteParts(text).map((part, i) =>
        part.kind === "text" ? (
          part.text
        ) : (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" aria-label={`${part.href} (opens in a new tab)`} className={textLink}>
            {part.href}
          </a>
        ),
      )}
    </p>
  );
}
