import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import notices from "./notices.json";

/**
 * The licence of every package this app ships.
 *
 * Serving minified JavaScript to a browser is distributing it, and the
 * permissive licences in that bundle all ask the same thing in return: that
 * their copyright and permission notice travel with the copy. This page is
 * where they travel to, and it is deliberately outside the sign-in wall — a
 * notice nobody may read without an account is not a notice.
 *
 * Regenerate after any dependency change: `npm run notices`.
 */

export const metadata = {
  title: "Third-party notices",
  description: "Open-source packages Docyfier is built with, and their licences.",
};

export default function ThirdPartyNoticesPage() {
  return (
    <>
      <header className="app-header">
        <BrandMark href="/" />
        <div className="toolbar">
          <Link href="/" className="btn">
            ← Back
          </Link>
        </div>
      </header>

      <main className="picker">
        <h1 className="picker-heading">Third-party notices</h1>
        <p className="notices-intro">
          Docyfier is built with {notices.length} open-source packages. Each is listed below with
          the licence it is distributed under.
        </p>

        <ul className="notices">
          {notices.map((notice) => (
            <li key={`${notice.name}@${notice.version}`}>
              <details>
                <summary>
                  <span className="notices-name">{notice.name}</span>
                  <span className="notices-version">{notice.version}</span>
                  <span className="notices-license">{notice.license}</span>
                </summary>
                <pre className="notices-text">
                  {notice.text ||
                    `Distributed under the ${notice.license} licence. This package ships no licence file of its own.`}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
