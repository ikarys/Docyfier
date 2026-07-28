"use client";

import type { Probe } from "./provider-probe";

/**
 * Which model to call: picked from what the server offers, or typed by hand for
 * the servers that cannot be asked. The button beside it is what fills the list.
 */
export function ProviderModelField({
  model,
  setModel,
  manual,
  setManual,
  probe,
  test,
}: {
  model: string;
  setModel: (model: string) => void;
  manual: boolean;
  setManual: (manual: boolean) => void;
  probe: Probe;
  test: () => void;
}) {
  const models = probe.state === "ok" ? probe.models : [];
  const knownModel = model === "" || models.includes(model);

  return (
    <div className="field">
      <span className="field-label">Model</span>
      <div className="field-row">
        {manual ? (
          <input
            className="field-input"
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model id, e.g. gpt-4o"
            spellCheck={false}
          />
        ) : (
          <>
            <input type="hidden" name="model" value={model} />
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
          </>
        )}
        <button
          type="button"
          className="btn"
          disabled={probe.state === "loading"}
          onClick={test}
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
      <label className="field-help field-checkbox">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => setManual(e.target.checked)}
        />
        Enter model id manually (for servers without a /models endpoint)
      </label>
      {probe.state === "ok" && (
        <span className="field-help field-ok">
          {probe.via === "chat"
            ? "✓ Connected — model responded"
            : `✓ Connected — ${probe.models.length} model${
                probe.models.length === 1 ? "" : "s"
              } available`}
        </span>
      )}
      {probe.state === "error" && (
        <span className="field-help field-error">✕ {probe.message}</span>
      )}
    </div>
  );
}
