"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveAiSettingsAction,
  listModelsAction,
} from "@/app/settings/actions";
import type { AiSettings } from "@/lib/settings-types";

type Probe =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; models: string[] }
  | { state: "error"; message: string };

/** AI model configuration: endpoint, model picker, optional API key. */
export function SettingsForm({ initial }: { initial: AiSettings }) {
  const [saveState, formAction, saving] = useActionState(
    saveAiSettingsAction,
    null,
  );
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [probe, setProbe] = useState<Probe>({ state: "idle" });

  const test = async (url = baseUrl, key = apiKey) => {
    setProbe({ state: "loading" });
    const res = await listModelsAction(url, key);
    setProbe(
      res.ok
        ? { state: "ok", models: res.models.map((m) => m.id) }
        : { state: "error", message: res.error },
    );
  };

  // Probe the configured server once on mount to populate the model picker.
  useEffect(() => {
    void test(initial.baseUrl, initial.apiKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const models = probe.state === "ok" ? probe.models : [];
  const knownModel = model === "" || models.includes(model);

  return (
    <form action={formAction} className="settings-card">
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

      <label className="field">
        <span className="field-label">API key (optional)</span>
        <input
          className="field-input"
          name="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Not needed for LM Studio"
          autoComplete="off"
        />
      </label>

      <div className="field">
        <span className="field-label">Model</span>
        <input type="hidden" name="model" value={model} />
        <div className="field-row">
          <select
            className="field-input"
            value={knownModel ? model : "__custom"}
            onChange={(e) => {
              if (e.target.value !== "__custom") setModel(e.target.value);
            }}
          >
            <option value="">Auto — first model on the server</option>
            {models.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
            {!knownModel && <option value="__custom">{model} (saved)</option>}
          </select>
          <button
            type="button"
            className="btn"
            disabled={probe.state === "loading"}
            onClick={() => void test()}
          >
            {probe.state === "loading" ? (
              <>
                <span className="spinner" aria-hidden /> Testing…
              </>
            ) : (
              "Test connection"
            )}
          </button>
        </div>
        {probe.state === "ok" && (
          <span className="field-help field-ok">
            ✓ Connected — {probe.models.length} model
            {probe.models.length === 1 ? "" : "s"} available
          </span>
        )}
        {probe.state === "error" && (
          <span className="field-help field-error">✕ {probe.message}</span>
        )}
      </div>

      <label className="field">
        <span className="field-label">Max output tokens</span>
        <input
          className="field-input"
          name="maxOutputTokens"
          type="number"
          min={256}
          step={256}
          defaultValue={initial.maxOutputTokens}
        />
        <span className="field-help">
          Ceiling per AI response. Whole-document edits need room: large
          documents may require 16k-64k. Higher = slower on local models.
        </span>
      </label>

      <div className="settings-actions">
        {saveState?.error && (
          <span className="field-error">{saveState.error}</span>
        )}
        {saveState?.saved && !saving && (
          <span className="field-ok">Saved ✓</span>
        )}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
