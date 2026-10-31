"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api/client";

/** Plan decision P-4: sign-out is a POST from a button, never a GET link. */
function useSignOut() {
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

  return { busy, signOut };
}

/** The same POST as a row in the account menu. */
export function SignOutMenuItem() {
  const { busy, signOut } = useSignOut();
  return (
    <DropdownMenuItem onClick={signOut} disabled={busy}>
      <LogOut />
      {busy ? "Signing out…" : "Sign out"}
    </DropdownMenuItem>
  );
}

export function SignOutButton() {
  const { busy, signOut } = useSignOut();

  return (
    <Button type="button" variant="outline" size="header" onClick={signOut} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
