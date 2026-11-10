import { noteParts } from "@/lib/app/note-text";

import { textLink } from "./styles";

/** A teacher's note as written: line breaks kept, http(s) and www. links opening in a new tab (S-26, R-10). */
export function NoteText({ text }: { text: string }) {
  return (
    <p className="text-app-base break-words whitespace-pre-wrap text-app-ink">
      {noteParts(text).map((part, i) =>
        part.kind === "text" ? (
          part.text
        ) : (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" aria-label={`${part.text} (opens in a new tab)`} className={textLink}>
            {part.text}
          </a>
        ),
      )}
    </p>
  );
}
