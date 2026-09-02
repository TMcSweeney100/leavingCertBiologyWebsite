import { redirect } from "next/navigation";

import { DEFAULT_CLASS } from "@/lib/site";

// Links already shared with students point at the bare origin (spec §4.3),
// so this redirect is the only thing keeping them alive now that the site
// serves one page per class at `/[class]`.
export default function Home() {
  redirect(`/${DEFAULT_CLASS}`);
}
