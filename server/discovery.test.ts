import { describe, expect, it } from "vitest";
import { searchPosts, shareUrls, visiblePosts } from "../client/src/lib/discovery";

describe("discovery helpers", () => {
  const posts = [
    { title: "Rain on the windows", excerpt: "A quiet morning in the city." },
    { title: "The long walk home", excerpt: "Notes from the river path." },
  ];

  it("finds keywords across titles and excerpts", () => {
    expect(searchPosts(posts, "WINDOWS")).toHaveLength(1);
    expect(searchPosts(posts, "river")[0]?.title).toBe("The long walk home");
    expect(searchPosts(posts, "")).toHaveLength(2);
  });

  it("slices a feed for progressive loading", () => {
    expect(visiblePosts([1, 2, 3, 4], 2)).toEqual([1, 2]);
    expect(visiblePosts([1, 2, 3, 4], 10)).toHaveLength(4);
  });

  it("builds encoded share links", () => {
    const links = shareUrls("https://paper.test/post/rain", "Rain & windows");
    expect(links.x).toContain("https%3A%2F%2Fpaper.test%2Fpost%2Frain");
    expect(links.facebook).toContain("sharer.php");
    expect(links.email).toContain("mailto:");
  });
});
