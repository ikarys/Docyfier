"use client";

/** Hands the document to the browser's print dialog — the PDF path. The caller
 * says how it is dressed: a toolbar button on its own, a row inside a menu. */
export function PrintButton({ className = "btn btn-primary" }: { className?: string }) {
  return (
    <button className={className} onClick={() => window.print()}>
      ↓ PDF
    </button>
  );
}
