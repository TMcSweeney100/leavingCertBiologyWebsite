"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

/** Plan decision P-4: sign-out is a POST from a button, never a GET link. */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await api.sendNoContent("POST", "/auth/logout");
    } finally {
      // Whether or not Spring answered, the browser should leave the app.
      router.push("/login");
    }
  }

  return (
    <Button type="button" variant="outline" size="header" onClick={signOut} disabled={busy}>
      Sign out
    </Button>
  );
}
