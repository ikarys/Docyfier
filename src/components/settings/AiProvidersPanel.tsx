"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAiProviderAction,
  setActiveAiProviderAction,
} from "@/app/settings/ai/actions";
import type { AiProviderSummary } from "@/lib/settings-types";
import { AiProviderForm } from "./AiProviderForm";

const BLANK: AiProviderSummary = {
  id: "",
  label: "",
  baseUrl: "http://localhost:1234/v1",
  model: "",
  maxOutputTokens: 32768,
  hasApiKey: false,
  keyUnreadable: false,
};

function host(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

/** The configured LLM endpoints: pick the active one, add, edit, remove. */
export function AiProvidersPanel({
  providers,
  activeId,
}: {
  providers: AiProviderSummary[];
  activeId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    startTransition(async () => {
      const res = await action();
      setError(res.ok ? null : res.error);
      router.refresh();
    });

  return (
    <div className="provider-list">
      {providers.map((provider) =>
        editing === provider.id ? (
          <AiProviderForm
            key={provider.id}
            initial={provider}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        ) : (
          <div
            key={provider.id}
            className="provider-row"
            data-active={provider.id === activeId || undefined}
          >
            <label className="provider-pick">
              <input
                type="radio"
                name="activeProvider"
                checked={provider.id === activeId}
                disabled={pending}
                onChange={() => run(() => setActiveAiProviderAction(provider.id))}
              />
              <span className="provider-name">{provider.label}</span>
            </label>
            <span className="provider-meta">
              {provider.model || "Auto model"} · {host(provider.baseUrl)}
              {provider.hasApiKey && " · 🔒 key"}
              {provider.keyUnreadable && " · ⚠ stored key unreadable — enter it again"}
            </span>
            <div className="provider-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setAdding(false);
                  setEditing(provider.id);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={pending || providers.length <= 1}
                title={
                  providers.length <= 1
                    ? "At least one provider must remain configured"
                    : undefined
                }
                onClick={() => run(() => deleteAiProviderAction(provider.id))}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      )}

      {error && <p className="field-error">{error}</p>}

      {adding ? (
        <AiProviderForm
          initial={BLANK}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : (
        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setAdding(true);
            }}
          >
            + Add provider
          </button>
        </div>
      )}
    </div>
  );
}
