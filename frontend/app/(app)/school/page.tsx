import { AppMain } from "@/components/app/app-main";
import { lead, pageTitle } from "@/components/app/styles";

// Plan decision P-6: a placeholder so a school leader has somewhere to land.
export default function SchoolPage() {
  return (
    <AppMain>
      <h1 className={pageTitle}>School overview</h1>
      <p className={`mt-2.5 ${lead}`}>Your school overview arrives in Phase 5.</p>
    </AppMain>
  );
}
