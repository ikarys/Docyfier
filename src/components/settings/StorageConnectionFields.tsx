"use client";

import { WriteOnlySecretField } from "./WriteOnlySecretField";
import type { ConnectionFields } from "./connection-fields";

/** Everything a SQL backend needs to be reached. Hidden when documents are files. */
export function StorageConnectionFields({
  fields,
  hasSavedPassword,
  change,
}: {
  fields: ConnectionFields;
  hasSavedPassword: boolean;
  change: (fields: ConnectionFields) => void;
}) {
  const { host, port, user, password, database, ssl } = fields;

  return (
    <>
      <label className="field">
        <span className="field-label">Host</span>
        <input
          className="field-input"
          name="host"
          value={host}
          onChange={(e) => change({ ...fields, host: e.target.value })}
          placeholder="localhost"
          spellCheck={false}
        />
      </label>

      <label className="field">
        <span className="field-label">Port</span>
        <input
          className="field-input"
          name="port"
          type="number"
          min={1}
          max={65535}
          value={port}
          onChange={(e) => change({ ...fields, port: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">User</span>
        <input
          className="field-input"
          name="user"
          value={user}
          onChange={(e) => change({ ...fields, user: e.target.value })}
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      <WriteOnlySecretField
        label="Password"
        name="password"
        noun="password"
        secret={password}
        stored={hasSavedPassword}
        change={(password) => change({ ...fields, password })}
      />

      <label className="field">
        <span className="field-label">Database</span>
        <input
          className="field-input"
          name="database"
          value={database}
          onChange={(e) => change({ ...fields, database: e.target.value })}
          placeholder="docyfier"
          spellCheck={false}
        />
        <span className="field-help">
          The database must already exist. Docyfier creates its
          <code> documents </code> table on first connection.
        </span>
      </label>

      <div className="field">
        <span className="field-label">TLS</span>
        <label className="field-help field-checkbox">
          <input
            type="checkbox"
            name="ssl"
            checked={ssl}
            onChange={(e) => change({ ...fields, ssl: e.target.checked })}
          />
          Connect over TLS (required by most hosted databases)
        </label>
        <span className="field-help">
          Certificates are verified: a self-signed certificate must be trusted by
          the system.
        </span>
      </div>
    </>
  );
}
