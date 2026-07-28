import { describe, expect, it } from "vitest";
import { PluginKey } from "@tiptap/pm/state";
import { EmojiCommand } from "./emoji-command";
import { SlashCommand } from "./slash-command";

/**
 * Two suggestion plugins sharing the default key are, to ProseMirror, two
 * instances of one key: it refuses them, and the editor fails to mount — a
 * blank page, not a degraded menu. The rule is that every suggestion carries a
 * key of its own.
 */
const keyOf = (extension: { options: { suggestion: { pluginKey?: unknown } } }) =>
  extension.options.suggestion.pluginKey;

describe("the editor's suggestion plugins", () => {
  it("each carry a key of their own", () => {
    expect(keyOf(SlashCommand)).toBeInstanceOf(PluginKey);
    expect(keyOf(EmojiCommand)).toBeInstanceOf(PluginKey);
  });

  it("never share one, whatever the writing style enables", () => {
    expect(keyOf(SlashCommand)).not.toBe(keyOf(EmojiCommand));
  });
});
