import { JoinCodeForm } from "@/components/app/join-code-form";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;
  return (
    <main>
      <JoinCodeForm invalid={invalid === "1"} />
    </main>
  );
}
