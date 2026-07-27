"use server";

import { redirect } from "next/navigation";
import {
  MIN_PASSWORD_LENGTH,
  endSession,
  isPasswordSet,
  setPassword,
  startSession,
  verifyPassword,
} from "@/lib/auth";

export type LoginState = { error: string } | null;

/** Log in, or — on a fresh instance — choose the password that will guard it. */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await isPasswordSet())) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    if (password !== confirm) return { error: "The two passwords do not match." };
    await setPassword(password);
    await startSession();
    redirect("/");
  }

  const result = await verifyPassword(password);
  if (result === "locked") {
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }
  if (result !== "ok") return { error: "Wrong password." };

  await startSession();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
