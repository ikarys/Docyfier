/**
 * Whether this instance asks for a password at all (PLAN.md STEP 4).
 *
 * Opt-in: a local run stays open until credentials exist, so nobody has to
 * invent a password to try the app. A deployment can force either answer —
 * `"0"` keeps an instance open even with credentials lying around, `"1"` sends
 * the first visitor through the setup form before any password is chosen.
 */
export function accessEnabled(flag: string | undefined, hasCredentials: boolean): boolean {
  if (flag === "0") return false;
  if (flag === "1") return true;
  return hasCredentials;
}
