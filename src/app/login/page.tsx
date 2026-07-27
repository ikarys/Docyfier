import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH, hasSession, isPasswordSet } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in — Docyfier" };

export default async function LoginPage() {
  if (await hasSession()) redirect("/");
  const configured = await isPasswordSet();

  return (
    <main className="picker login-page">
      <span className="brand">
        Docy<span>fier</span>
      </span>
      <h1>{configured ? "Sign in" : "Choose a password"}</h1>
      <p className="lede">
        {configured
          ? "This instance is protected by a single password."
          : `First run: pick the password that will guard this instance (${MIN_PASSWORD_LENGTH} characters minimum).`}
      </p>
      <LoginForm configured={configured} />
    </main>
  );
}
