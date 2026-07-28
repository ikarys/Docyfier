import { BrandForm } from "@/components/settings/BrandForm";
import { ScopeIntro } from "@/components/settings/ScopeIntro";
import { WritingStyleForm } from "@/components/settings/WritingStyleForm";
import { DEFAULT_PRESET } from "@/domain/documents/theme";
import { requireAuth } from "@/lib/auth";
import { getBrand, getStyleRecord } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Style — Docyfier" };

export default async function StyleSettingsPage() {
  await requireAuth();
  const [brand, writing] = await Promise.all([getBrand(), getStyleRecord()]);

  return (
    <>
      <ScopeIntro scope="style" />
      <h2 className="settings-heading">Visual identity</h2>
      <BrandForm initial={brand} fallback={{ preset: DEFAULT_PRESET }} />
      <h2 className="settings-heading">Writing style</h2>
      <WritingStyleForm initial={writing} />
    </>
  );
}
