import { redirect } from "next/navigation";

import { ErrorPanel } from "@/components/app/error-panel";
import { JoinButton } from "@/components/app/join-button";
import { SignUpForm } from "@/components/app/sign-up-form";
import { joinPreviewSchema } from "@/lib/api/schemas";
import { serverApi } from "@/lib/api/server";
import { attempt } from "@/lib/app/attempt";
import { getSession } from "@/lib/app/session";

export const dynamic = "force-dynamic";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await attempt(() => serverApi.get(`/join/${encodeURIComponent(code)}`, joinPreviewSchema));
  if (!preview.ok) {
    if (preview.error.code === "JOIN_CODE_INVALID") redirect("/join?invalid=1");
    return (
      <main>
        <ErrorPanel error={preview.error} />
      </main>
    );
  }
  const me = await getSession().catch(() => null);

  return (
    <main>
      <h1>Join {preview.data.className}</h1>
      <p>
        {preview.data.subjectName}, {preview.data.schoolName}
      </p>
      {me ? (
        <>
          <p>Signed in as {me.username}.</p>
          <JoinButton code={code} />
        </>
      ) : (
        <SignUpForm code={code} />
      )}
    </main>
  );
}
