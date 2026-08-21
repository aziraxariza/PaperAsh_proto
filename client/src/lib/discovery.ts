export type SearchablePost = { title: string; excerpt: string; body?: string };

export function searchPosts<T extends SearchablePost>(posts: T[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return posts;
  return posts.filter(post => [post.title, post.excerpt, post.body ?? ""].join(" ").toLocaleLowerCase().includes(normalized));
}

export function visiblePosts<T>(posts: T[], count: number) {
  return posts.slice(0, Math.max(0, count));
}

export function shareUrls(url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return {
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
  };
}
