import Link from "next/link";
import { TEMPLATES } from "@/lib/templates";
import { assertTemplatesValid } from "@/lib/doc/templates-check";
import { createFromTemplateAction, newDocumentAction } from "@/app/actions";
import { ImportCard } from "@/components/ImportCard";

/**
 * Template gallery (PLAN.md STEP U5). Statically rendered, so the schema
 * assertion below runs during `next build`: a template that no longer
 * validates breaks the build instead of a user's document.
 */
assertTemplatesValid();

export const metadata = { title: "New document — Docyfier" };

export default function NewDocumentPage() {
  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          Docy<span>fier</span>
        </Link>
        <Link href="/settings" className="btn" title="Settings">
          ⚙ Settings
        </Link>
      </header>

      <main className="picker">
        <h1>New document</h1>
        <p className="lede">
          Start from a template — every one is a real, editable document — from
          a blank page, or from a file you already have.
        </p>

        <div className="tpl-grid">
          <form action={newDocumentAction} className="tpl-card tpl-card-blank">
            <button type="submit">
              <span className="tpl-thumb tpl-thumb-blank" aria-hidden />
              <span className="tpl-card-label">Blank document</span>
              <span className="tpl-card-desc">
                An empty page. Write it yourself, or ask the assistant.
              </span>
            </button>
          </form>

          <ImportCard />

          {TEMPLATES.map((template) => (
            <form
              key={template.id}
              action={createFromTemplateAction.bind(null, template.id)}
              className="tpl-card"
            >
              <button type="submit">
                <span className="tpl-thumb" aria-hidden>
                  {template.thumb.map((block, i) => (
                    <span key={i} className={`tpl-block tpl-block-${block}`} />
                  ))}
                </span>
                <span className="tpl-card-label">{template.label}</span>
                <span className="tpl-card-desc">{template.description}</span>
              </button>
            </form>
          ))}
        </div>
      </main>
    </>
  );
}
