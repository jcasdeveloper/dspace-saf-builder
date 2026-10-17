import ExcelJS from "exceljs";
import type { MappingConfig, FileMetadata, MetadataEntry } from "../types";
import { isDateField, isNameField, splitNames } from "./metadata-fields";

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

export async function parseExcel(buffer: ArrayBuffer): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [], totalRows: 0, warnings: [] };

  const sheetValues = worksheet.getSheetValues() as unknown as (unknown | null)[][];
  if (!sheetValues || sheetValues.length === 0) {
    return { headers: [], rows: [], totalRows: 0, warnings: [] };
  }

  const cellToString = (cell: unknown): string => {
    if (cell === null || cell === undefined) return "";
    if (cell instanceof Date) {
      const y = cell.getFullYear();
      const m = String(cell.getMonth() + 1).padStart(2, "0");
      const d = String(cell.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof cell === "object") {
      const r = cell as { text?: unknown; richText?: Array<{ text?: unknown }> };
      if (typeof r.text === "string") return r.text;
      if (Array.isArray(r.richText)) return r.richText.map((p) => String(p.text ?? "")).join("");
    }
    return String(cell);
  };

  // ExcelJS getSheetValues() is 1-indexed: result[N] is row N, and each
  // row's column 0 is a null placeholder. So the header row lives at index 1,
  // and each row's content starts at column index 1.
  const headerRow = sheetValues[1] || [];
  const headers = headerRow.map((c) => cellToString(c).trim()).filter((h) => h.length > 0);

  // Drop rows that are entirely empty. Workbooks styled to a large
  // dimension (e.g. dimension ref="A1:L638") will otherwise report every
  // styled-empty trailing row as a "row", which causes the importer to
  // show hundreds of false rows and floods the column-count warning panel.
  const rows = sheetValues
    .slice(2)
    .map((row) => headers.map((_, i) => cellToString(row?.[i + 1]).trim()))
    .filter((r) => r.some((cell) => cell.length > 0));

  return { headers, rows, totalRows: rows.length, warnings: [] };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const text = await file.text();
    return parseCsv(text);
  }

  if (ext === "xlsx") {
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

const MONTHS: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

export interface InterpretedDate {
  value: string;
  interpreted: boolean;
}

export function interpretDate(raw: string): InterpretedDate {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "", interpreted: false };

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { value: trimmed, interpreted: true };
  }

  const isoDateTime = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoDateTime) {
    return { value: isoDateTime[1], interpreted: true };
  }

  if (/^\d{4}$/.test(trimmed)) {
    return { value: trimmed, interpreted: true };
  }

  const yearMonth = trimmed.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonth) {
    const m = Number(yearMonth[2]);
    if (m >= 1 && m <= 12) {
      return { value: `${yearMonth[1]}-${String(m).padStart(2, "0")}`, interpreted: true };
    }
    return { value: trimmed, interpreted: false };
  }

  const numeric = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (numeric) {
    let day = Number(numeric[1]);
    let month = Number(numeric[2]);
    if (day <= 12 && month > 12) {
      [day, month] = [month, day];
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        value: `${numeric[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        interpreted: true,
      };
    }
    return { value: trimmed, interpreted: false };
  }

  const monthYear = trimmed.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (monthYear) {
    const m = MONTHS[monthYear[1].toLowerCase()];
    if (m) return { value: `${monthYear[2]}-${m}`, interpreted: true };
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?\,?\s+(\d{4})$/);
  if (dayMonthYear) {
    const m = MONTHS[dayMonthYear[2].toLowerCase()];
    const d = Number(dayMonthYear[1]);
    if (m && d >= 1 && d <= 31) {
      return {
        value: `${dayMonthYear[3]}-${m}-${String(d).padStart(2, "0")}`,
        interpreted: true,
      };
    }
  }

  const monthDayYear = trimmed.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})\,?\s+(\d{4})$/);
  if (monthDayYear) {
    const m = MONTHS[monthDayYear[1].toLowerCase()];
    const d = Number(monthDayYear[2]);
    if (m && d >= 1 && d <= 31) {
      return {
        value: `${monthDayYear[3]}-${m}-${String(d).padStart(2, "0")}`,
        interpreted: true,
      };
    }
  }

  return { value: trimmed, interpreted: false };
}

export function applyMapping(
  parsed: ParsedSpreadsheet,
  mappings: MappingConfig[],
  collectionHandle: string
): FileMetadata[] {
  const items: FileMetadata[] = [];

  for (const row of parsed.rows) {
    const fields: Record<string, MetadataEntry[]> = {};

    for (let i = 0; i < parsed.headers.length; i++) {
      const mapping = mappings.find((m) => m.columnName === parsed.headers[i]);
      if (!mapping || !mapping.metadataField) continue;

      const cellValue = row[i]?.trim() || "";
      if (!cellValue) continue;

      const metadataField = mapping.metadataField;

      if (isNameField(metadataField)) {
        const names = splitNames(cellValue);
        if (names.length > 0) {
          if (!fields[metadataField]) fields[metadataField] = [];
          for (const name of names) {
            fields[metadataField].push({ value: name });
          }
        }
      } else if (isDateField(metadataField)) {
        const { value } = interpretDate(cellValue);
        if (!fields[metadataField]) fields[metadataField] = [];
        fields[metadataField].push({ value });
      } else {
        if (!fields[metadataField]) {
          fields[metadataField] = [];
        }
        fields[metadataField].push({ value: cellValue });
      }
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
