import type { FileMetadata } from "@/types";

const REQUIRED_FIELDS = [
  { label: "dc.title", prefix: "dc.title" },
  { label: "dc.contributor", prefix: "dc.contributor" },
  { label: "dc.date", prefix: "dc.date" },
];

export function hasRequiredFields(item: FileMetadata): boolean {
  return REQUIRED_FIELDS.every(({ prefix }) =>
    Object.keys(item.fields).some(
      (key) => key.startsWith(prefix) && item.fields[key].some((e) => e.value.trim() !== "")
    )
  );
}

export function generateMetadataCsv(items: FileMetadata[]): string {
  const allHeaders = new Set<string>();
  for (const item of items) {
    for (const header of Object.keys(item.fields)) {
      allHeaders.add(header);
    }
  }

  const headers = Array.from(allHeaders).sort((a, b) => {
    const aReq = REQUIRED_FIELDS.findIndex((f) => a.startsWith(f.prefix));
    const bReq = REQUIRED_FIELDS.findIndex((f) => b.startsWith(f.prefix));
    if (aReq !== -1 && bReq !== -1) return aReq - bReq;
    if (aReq !== -1) return -1;
    if (bReq !== -1) return 1;
    return a.localeCompare(b);
  });

  const rows: string[] = [];
  rows.push(["id", "collection", ...headers].map(escapeCsvField).join(","));

  for (const item of items) {
    const row: string[] = ["+", item.collectionHandle || ""];
    for (const header of headers) {
      const entries = item.fields[header] || [];
      const values = entries.map((e) => e.value).filter((v) => v.trim() !== "");
      row.push(values.join("||"));
    }
    rows.push(row.map(escapeCsvField).join(","));
  }

  return rows.join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
