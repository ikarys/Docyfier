"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/login/actions";

function SubmitButton({ configured }: { configured: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "…" : configured ? "Sign in" : "Set password"}
    </button>
  );
}

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="settings-card login-card">
      <label className="field">
        <span className="field-label">Password</span>
        <input
          className="field-input"
          type="password"
          name="password"
          autoComplete={configured ? "current-password" : "new-password"}
          autoFocus
          required
        />
      </label>

      {configured ? null : (
        <label className="field">
          <span className="field-label">Confirm password</span>
          <input
            className="field-input"
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
          />
        </label>
      )}

      {state?.error ? (
        <span className="field-error" role="alert">
          {state.error}
        </span>
      ) : null}

      <div className="settings-actions">
        <SubmitButton configured={configured} />
      </div>
    </form>
  );
}
