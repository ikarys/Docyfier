"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveAiProviderAction } from "@/app/settings/ai/actions";
import type { AiProviderSummary } from "@/lib/settings-types";

const MANAGE = "__manage";

/**
 * Switch the provider every AI surface runs against, without leaving the page —
 * the point of configuring several: a quota runs out, or a task needs the other
 * model. Hidden while only one provider exists, so a single-endpoint instance
 * keeps the header it had.
 */
export function ModelSwitcher({
  providers,
  activeId,
}: {
  providers: AiProviderSummary[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (providers.length < 2) return null;

  return (
    <select
      className="model-switch"
      value={activeId}
      disabled={pending}
      title="Model used by the AI features"
      aria-label="AI provider"
      onChange={(e) => {
        const id = e.target.value;
        if (id === MANAGE) {
          router.push("/settings/ai");
          return;
        }
        startTransition(async () => {
          await setActiveAiProviderAction(id);
          router.refresh();
        });
      }}
    >
      {providers.map((provider) => (
        <option key={provider.id} value={provider.id}>
          {provider.label}
        </option>
      ))}
      <option value={MANAGE}>⚙ Manage providers…</option>
    </select>
  );
}
