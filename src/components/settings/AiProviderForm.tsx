"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveAiProviderAction,
  listModelsAction,
  testChatAction,
} from "@/app/settings/ai/actions";
import type { AiProviderSummary } from "@/lib/settings-types";
import { ProviderModelField } from "./ProviderModelField";
import { ProviderOutputFields } from "./ProviderOutputFields";
import {
  afterChat,
  afterModelList,
  missingModelId,
  type Probe,
} from "./provider-probe";
import { WriteOnlySecretField } from "./WriteOnlySecretField";
import { noSecretTyped } from "./write-only-secret";

/** One LLM endpoint: name, server, model picker, optional API key. Used both to
 * add a provider and to edit an existing one — the stored API key never comes
 * down here, so an untouched key field means "keep it". */
export function AiProviderForm({
  initial,
  onDone,
}: {
  initial: AiProviderSummary;
  onDone?: () => void;
}) {
  const [saveState, formAction, saving] = useActionState(saveAiProviderAction, null);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(noSecretTyped);
  const [model, setModel] = useState(initial.model);
  const [probe, setProbe] = useState<Probe>({ state: "idle" });
  const [manualModel, setManualModel] = useState(false);

  const test = async (url = baseUrl, key = apiKey.value, useManual = manualModel) => {
    setProbe({ state: "loading" });

    if (useManual) {
      const complaint = missingModelId(model);
      setProbe(complaint ?? afterChat(await testChatAction(url, key, model, initial.id), model));
      return;
    }

    const plan = afterModelList(await listModelsAction(url, key, initial.id), model);
    if ("manual" in plan) setManualModel(true);
    if ("retryAsChat" in plan) {
      void test(url, key, true);
      return;
    }
    setProbe(plan.probe);
  };

  // Probe the configured server once on mount to populate the model picker.
  // A brand-new provider has no server yet, so there is nothing to ask.
  useEffect(() => {
    if (initial.id) void test(initial.baseUrl, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the editor once the save went through.
  useEffect(() => {
    if (saveState?.saved && !saving) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState, saving]);

  return (
    <form action={formAction} className="settings-card">
      <input type="hidden" name="id" value={initial.id} />

      <label className="field">
        <span className="field-label">Name</span>
        <input
          className="field-input"
          name="label"
          defaultValue={initial.label}
          placeholder="LM Studio (local)"
        />
        <span className="field-help">Shown in the model switcher.</span>
      </label>

      <label className="field">
        <span className="field-label">Server URL (OpenAI-compatible)</span>
        <input
          className="field-input"
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:1234/v1"
          spellCheck={false}
        />
        <span className="field-help">
          LM Studio, Ollama, vLLM, or any OpenAI-compatible endpoint.
        </span>
      </label>

      <WriteOnlySecretField
        label="API key (optional)"
        name="apiKey"
        noun="key"
        secret={apiKey}
        stored={initial.hasApiKey}
        emptyPlaceholder="Not needed for LM Studio"
        change={setApiKey}
      />

      <ProviderModelField
        model={model}
        setModel={setModel}
        manual={manualModel}
        setManual={setManualModel}
        probe={probe}
        test={() => void test()}
      />

      <ProviderOutputFields initial={initial} />

      <div className="settings-actions">
        {saveState?.error && <span className="field-error">{saveState.error}</span>}
        {onDone && (
          <button className="btn" type="button" onClick={onDone}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save provider"}
        </button>
      </div>
    </form>
  );
}
