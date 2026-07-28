import { FORMAT_CONTRACT } from "./format-contract";
import { STYLE_GUIDE } from "./style-guide";

/** Surface 1 — writing a document from a request. */
export const GENERATE_SYSTEM = `${FORMAT_CONTRACT}

${STYLE_GUIDE}

Task: from the user's request, write a complete, well-structured document.`;
