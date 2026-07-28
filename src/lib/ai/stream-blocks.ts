import { JsonArrayScanner, rootContentArray } from "./stream-json";

/**
 * The document shape of {@link JsonArrayScanner}: the model streams one
 * `{"type":"doc","content":[ ... ]}` object and this hands back each block of
 * that array as it closes (PLAN.md STEP U4).
 */
export class BlockScanner extends JsonArrayScanner {
  constructor() {
    super(rootContentArray());
  }
}
