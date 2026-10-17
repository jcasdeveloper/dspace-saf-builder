export const NAME_FIELDS = new Set([
  "dc.contributor.author",
  "dc.contributor.advisor",
  "dc.contributor.editor",
  "dc.contributor.illustrator",
  "dc.contributor.other",
  "dc.creator",
]);

export function isNameField(header: string): boolean {
  return NAME_FIELDS.has(header);
}

const EXTRA_DATE_FIELDS = new Set([
  "dcterms.modified",
  "dcterms.valid",
  "dcterms.dateAccepted",
]);

export function isDateField(header: string): boolean {
  return header.includes(".date") || EXTRA_DATE_FIELDS.has(header);
}

export function splitNames(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  let parts: string[];
  if (/[;\n]/.test(trimmed)) {
    parts = trimmed.split(/[;\n]/);
  } else if (trimmed.includes(",")) {
    const commaParts = trimmed.split(",").map((p) => p.trim());
    if (commaParts.length === 2 && commaParts[0].length > 0 && !/\s/.test(commaParts[0])) {
      parts = [trimmed];
    } else {
      parts = commaParts;
    }
  } else {
    parts = [trimmed];
  }

  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^\d+$/.test(p));
}
