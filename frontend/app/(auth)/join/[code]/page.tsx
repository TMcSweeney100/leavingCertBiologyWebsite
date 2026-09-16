import { redirect } from "next/navigation";

import { ErrorPanel } from "@/components/app/error-panel";
import { JoinButton } from "@/components/app/join-button";
import { SignUpForm } from "@/components/app/sign-up-form";
import { card, eyebrow, pageTitle } from "@/components/app/styles";
import { subjectEdge } from "@/components/app/subject";
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
      <main id="main">
        <ErrorPanel error={preview.error} />
      </main>
    );
  }
  const me = await getSession().catch(() => null);
  const { className, subjectName, schoolName } = preview.data;

  return (
    <main id="main">
      <h1 className={pageTitle}>Join a class</h1>
      {/* Pack D-1: the class comes first, so a student sees what they're joining before committing. */}
      <div className={`mt-3.5 border-l-4 px-5 py-4 lg:mt-1 ${card} ${subjectEdge(subjectName)}`}>
        <p className={`${eyebrow} text-app-muted`}>You&apos;re joining</p>
        <p className="mt-1.5 font-heading text-app-section font-bold tracking-[-.02em] text-app-ink">{className}</p>
        <p className="mt-1 text-app-meta leading-normal text-app-copy">
          {subjectName} · {schoolName}
        </p>
      </div>
      {me ? <JoinButton code={code} signedInAs={`${me.firstName} ${me.lastName}`} /> : <SignUpForm code={code} />}
    </main>
  );
}
