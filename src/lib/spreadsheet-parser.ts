import * as XLSX from "xlsx";
import type { MappingConfig, FileMetadata, MetadataEntry } from "../types";

export interface ParsedSpreadsheet {
  headers: string[];
  rows: string[][];
  totalRows: number;
  warnings: string[];
}

export function parseCsv(text: string): ParsedSpreadsheet {
  const delim = sniffDelimiter(text);
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      lines.push(current);
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0, warnings: [] };

  const colCount = inferColumnCount(lines, delim);
  const rows: string[][] = [];
  let row: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    row.push(lines[i].trim());
    if (row.length === colCount) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) rows.push(row);

  const warnings: string[] = [];
  const alignedRows = rows.filter((r) => {
    if (r.length !== colCount) {
      return false;
    }
    return true;
  });
  const dropped = rows.length - alignedRows.length;
  if (dropped > 0) {
    warnings.push(`${dropped} row${dropped !== 1 ? "s" : ""} dropped due to mismatched column count (expected ${colCount}).`);
  }

  if (alignedRows.length === 0) return { headers: [], rows: [], totalRows: 0, warnings };

  const headers = alignedRows[0] || [];

  return {
    headers,
    rows: alignedRows.slice(1),
    totalRows: alignedRows.length - 1,
    warnings,
  };
}

function sniffDelimiter(text: string): string {
  const firstLineEnd = Math.min(text.search(/[\r\n]/), 1024);
  const firstLine = firstLineEnd > 0 ? text.slice(0, firstLineEnd) : text.slice(0, 1024);
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function inferColumnCount(cells: string[], delim: string): number {
  let maxCols = 0;
  let cols = 0;
  for (const cell of cells) {
    cols++;
    if (cell === "" && delim === "\t") {
      if (cols > maxCols) maxCols = cols;
      cols = 0;
    }
  }
  if (maxCols === 0) {
    const firstLineEnd = cells.findIndex((c) => c === "");
    if (firstLineEnd > 0) {
      maxCols = firstLineEnd;
    } else {
      maxCols = cols;
    }
  }
  return maxCols || 1;
}

export function parseExcel(buffer: ArrayBuffer): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [], totalRows: 0, warnings: [] };

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

  if (data.length === 0) return { headers: [], rows: [], totalRows: 0, warnings: [] };

  const headers = (data[0] || []).map((h) => String(h).trim()).filter((h) => h.length > 0);
  const rows = data.slice(1).map((r) =>
    headers.map((_, i) => String(r[i] ?? "").trim())
  );

  return { headers, rows, totalRows: rows.length, warnings: [] };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const text = await file.text();
    return parseCsv(text);
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    return parseExcel(buffer);
  }

  throw new Error(`Unsupported file format: .${ext}`);
}

export function autoMapColumn(header: string): string | null {
  const lower = header.toLowerCase();

  if (lower.includes("title") || lower.includes("thesis") || lower.includes("report")) {
    return "dc.title";
  }
  if (
    lower.includes("submitted by") ||
    lower.includes("student name") ||
    lower.match(/^author/)
  ) {
    return "dc.contributor.author";
  }
  if (lower.includes("supervisor") || lower.includes("adviser") || lower.includes("advisor")) {
    return "dc.contributor.author";
  }
  if (lower.includes("other student") || lower.includes("co-author") || lower.includes("additional")) {
    return "dc.contributor.author";
  }
  if (lower.includes("date") || lower.includes("submission")) {
    return "dc.date.issued";
  }
  if (lower.includes("category") || lower.includes("type")) {
    return "dc.type";
  }
  if (lower.includes("student id") || (lower.includes("id") && lower.includes("student"))) {
    return null;
  }

  return null;
}

const AUTHOR_FIELDS = new Set([
  "dc.contributor.author",
]);

const DATE_FIELDS = new Set([
  "dc.date.issued",
  "dc.date.created",
  "dc.date.available",
  "dc.date.submitted",
  "dc.date.accepted",
  "dc.date.modified",
  "dc.date.copyright",
]);

const TRIM_PATTERN = /^\s+|\s+$/g;

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Already ISO-8601
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Year only: "2014"
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;

  // Year-month: "2014-06" or "June 2014" or "Jun 2014"
  const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonthMatch) return `${yearMonthMatch[1]}-${yearMonthMatch[2].padStart(2, "0")}-01`;

  // Try parsing with Date constructor
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // If all else fails, return raw value (will show as empty in DatePicker)
  return "";
}

export function applyMapping(
  parsed: ParsedSpreadsheet,
  mappings: MappingConfig[],
  collectionHandle: string
): FileMetadata[] {
  const items: FileMetadata[] = [];

  for (const row of parsed.rows) {
    const fields: Record<string, MetadataEntry[]> = {};
    const authorValues: string[] = [];

    for (let i = 0; i < parsed.headers.length; i++) {
      const mapping = mappings.find((m) => m.columnName === parsed.headers[i]);
      if (!mapping || !mapping.metadataField) continue;

      const cellValue = row[i]?.trim() || "";
      if (!cellValue) continue;

      const metadataField = mapping.metadataField;

      if (AUTHOR_FIELDS.has(metadataField)) {
        const parts = cellValue
          .split(/[,;]/)
          .map((s) => s.replace(TRIM_PATTERN, ""))
          .filter((s) => s.length > 0 && !s.match(/^\d+$/));
        authorValues.push(...parts);
      } else if (DATE_FIELDS.has(metadataField)) {
        const normalized = normalizeDate(cellValue);
        if (normalized) {
          if (!fields[metadataField]) fields[metadataField] = [];
          fields[metadataField].push({ value: normalized });
        }
      } else {
        if (!fields[metadataField]) {
          fields[metadataField] = [];
        }
        fields[metadataField].push({ value: cellValue });
      }
    }

    if (authorValues.length > 0) {
      fields["dc.contributor.author"] = authorValues.map((v) => ({ value: v }));
    }

    const hasContent = Object.keys(fields).length > 0;
    if (hasContent) {
      const filename = String(row[0] || `item_${items.length}`).trim() || `item_${items.length}`;
      items.push({
        filename,
        filePath: "",
        fields,
        collectionHandle,
      });
    }
  }

  return items;
}
