import { describe, expect, it } from "vitest";
import { embedError, embedFor, isEmbedFrame } from "./embed";

describe("embedError", () => {
  const valid = {
    provider: "YouTube",
    href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    title: null,
  };

  it("accepts what the allowlist itself produced", () => {
    expect(embedError(valid)).toBeNull();
  });

  it("refuses a frame from anywhere else, which is what a model might invent", () => {
    expect(embedError({ ...valid, src: "https://evil.example.com/x" })).toMatch(/allowed/);
    expect(embedError({ ...valid, src: 42 })).toMatch(/allowed/);
  });

  it("refuses a link a reader could not follow", () => {
    expect(embedError({ ...valid, href: "javascript:alert(1)" })).toMatch(/link/);
  });
});

describe("embedFor", () => {
  it("turns every shape of a YouTube link into the one frame it has", () => {
    const frame = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    expect(embedFor("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.src).toBe(frame);
    expect(embedFor("https://youtu.be/dQw4w9WgXcQ")?.src).toBe(frame);
    expect(embedFor("https://www.youtube.com/embed/dQw4w9WgXcQ")?.src).toBe(frame);
  });

  it("names the provider, which is what an export has to write", () => {
    expect(embedFor("https://vimeo.com/123456789")).toEqual({
      provider: "Vimeo",
      href: "https://vimeo.com/123456789",
      src: "https://player.vimeo.com/video/123456789",
    });
  });

  it("knows the other places a document points at", () => {
    expect(embedFor("https://www.loom.com/share/abc123def456")?.src).toBe(
      "https://www.loom.com/embed/abc123def456",
    );
    expect(embedFor("https://www.figma.com/design/abc/Board")?.provider).toBe("Figma");
  });

  it("refuses a host nobody allowed — an embed is never an arbitrary frame", () => {
    expect(embedFor("https://evil.example.com/player")).toBeNull();
    expect(embedFor("https://youtube.com.evil.example/watch?v=abc123")).toBeNull();
  });

  it("refuses anything that is not a page a browser would fetch", () => {
    expect(embedFor("javascript:alert(1)")).toBeNull();
    expect(embedFor("data:text/html,<script>")).toBeNull();
    expect(embedFor("not a url")).toBeNull();
  });

  it("refuses an allowed host with nothing to play", () => {
    expect(embedFor("https://www.youtube.com/feed/subscriptions")).toBeNull();
    expect(embedFor("https://vimeo.com/staffpicks")).toBeNull();
  });
});

describe("isEmbedFrame", () => {
  it("recognises a frame the allowlist itself produced", () => {
    expect(isEmbedFrame("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
    expect(isEmbedFrame("https://player.vimeo.com/video/123456789")).toBe(true);
  });

  it("refuses a frame from anywhere else, whatever a stored document says", () => {
    expect(isEmbedFrame("https://evil.example.com/embed/x")).toBe(false);
    expect(isEmbedFrame("")).toBe(false);
  });
});
