export function normalizeEditorUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const editorCommands = {
  bold: "bold",
  italic: "italic",
  link: "createLink",
} as const;
