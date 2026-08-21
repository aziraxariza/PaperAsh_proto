export function archiveKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function archiveLabel(value: Date | string) {
  const date = new Date(value);
  return { year: String(date.getFullYear()), month: date.toLocaleDateString(undefined, { month: "long" }) };
}

export function filterPostsByArchive<T extends { publishedAt: Date | string }>(posts: T[], filter: string) {
  return filter === "all" ? posts : posts.filter(post => archiveKey(post.publishedAt) === filter);
}
