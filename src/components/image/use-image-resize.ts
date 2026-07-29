"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import type { ImageAlignment } from "@/domain/documents/image";
import { widthFromDrag, type ImageDrag } from "./resize";

/**
 * The pointer half of a free resize: capture, move, release. What a drag
 * *means* is in `resize.ts`, which a test drives without a DOM; this only
 * turns events into the numbers that module reads.
 */
export function useImageResize(
  width: number,
  alignment: ImageAlignment,
  onWidth: (width: number) => void,
) {
  const drag = useRef<ImageDrag | null>(null);
  const [resizing, setResizing] = useState(false);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      // A width is a percentage of the text column, and the figure itself is
      // already a fraction of it — so the editor root is what to measure.
      const column = event.currentTarget.closest(".doc-editor")?.clientWidth ?? 0;
      if (!column) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        originX: event.clientX,
        originWidth: width,
        columnWidth: column,
        alignment,
      };
      setResizing(true);
    },
    [width, alignment],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      if (drag.current) onWidth(widthFromDrag(drag.current, event.clientX));
    },
    [onWidth],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
    setResizing(false);
  }, []);

  return {
    resizing,
    handleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
