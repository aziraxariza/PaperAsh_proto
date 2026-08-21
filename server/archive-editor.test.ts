import { describe, expect, it } from "vitest";
import { archiveKey, archiveLabel, filterPostsByArchive } from "../client/src/lib/blog";
import { editorCommands, normalizeEditorUrl } from "../client/src/lib/editor";

describe("archive and editor helpers", () => {
  const posts = [
    { publishedAt: "2026-02-11T12:00:00.000Z", title: "February" },
    { publishedAt: "2026-02-02T12:00:00.000Z", title: "Another February" },
    { publishedAt: "2025-11-08T12:00:00.000Z", title: "November" },
  ];

  it("creates stable year-month labels and filters entries", () => {
    expect(archiveKey(posts[0].publishedAt)).toBe("2026-02");
    expect(archiveLabel(posts[0].publishedAt).month).toBe("February");
    expect(filterPostsByArchive(posts, "2026-02")).toHaveLength(2);
    expect(filterPostsByArchive(posts, "all")).toHaveLength(3);
  });

  it("maps formatting commands and normalizes hyperlinks", () => {
    expect(editorCommands.bold).toBe("bold");
    expect(editorCommands.italic).toBe("italic");
    expect(editorCommands.link).toBe("createLink");
    expect(normalizeEditorUrl("example.com/about")).toBe("https://example.com/about");
    expect(normalizeEditorUrl("mailto:hello@example.com")).toBe("mailto:hello@example.com");
  });
});
