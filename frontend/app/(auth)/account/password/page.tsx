import { ChangePasswordForm } from "@/components/app/change-password-form";
import { landingFor } from "@/lib/app/navigation";
import { requireSession } from "@/lib/app/session";

// In the (auth) group, so there's no header: a forced user has nothing else to click.
export default async function ChangePasswordPage() {
  const me = await requireSession();
  return (
    <main id="main">
      <ChangePasswordForm forced={me.mustChangePassword} landing={landingFor({ ...me, mustChangePassword: false })} />
    </main>
  );
}
