import type { AccessEnvironment } from "@/domain/access/credentials";

/**
 * What the deployment says about access. One place reads `process.env` so no use
 * case has to, and an empty variable counts as unset — a `DOCYFIER_AUTH_PASSWORD=`
 * left in a compose file must not become the password.
 */
export const processEnvironment: AccessEnvironment = {
  password: () => nonEmpty(process.env.DOCYFIER_AUTH_PASSWORD),
  sessionKey: () => nonEmpty(process.env.DOCYFIER_AUTH_SECRET),
  accessFlag: () => process.env.DOCYFIER_AUTH,
};

function nonEmpty(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}
