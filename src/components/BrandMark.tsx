import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";

/**
 * Injected at build time by `next.config.ts` from the package version, so a
 * deployed instance shows what it is actually running — a runtime lookup would
 * read the wrong `package.json` in the standalone Docker output.
 */
const version = process.env.NEXT_PUBLIC_APP_VERSION;

const wordmark = (
  <>
    <BrandLogo />
    <span className="brand-name">
      Docy<span>fier</span>
    </span>
  </>
);

/**
 * The mark and the wordmark, with the running version beside them. `href` makes
 * it a way home; the page that is already home renders it inert.
 */
export function BrandMark({ href }: { href?: string }) {
  return (
    <span className="brand-line">
      {href ? (
        <Link href={href} className="brand">
          {wordmark}
        </Link>
      ) : (
        <span className="brand">{wordmark}</span>
      )}
      {version ? <span className="app-version">v{version}</span> : null}
    </span>
  );
}
