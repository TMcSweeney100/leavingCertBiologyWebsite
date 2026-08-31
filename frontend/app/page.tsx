import { SiteHeader } from "@/components/bipi/site-header";
import { SiteFooter } from "@/components/bipi/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1" />
      <SiteFooter />
    </>
  );
}
