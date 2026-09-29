import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Columns3,
  FileSpreadsheet,
  Rows3,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { fadeIn } from "@/lib/animations";
import { ALL_FIELDS } from "@/data/dc-fields";
import {
  parseSpreadsheetFile,
  autoMapColumn,
  applyMapping,
} from "@/lib/spreadsheet-parser";
import type { ParsedSpreadsheet } from "@/lib/spreadsheet-parser";
import type { MappingConfig, FileMetadata } from "../types";

interface SpreadsheetImporterProps {
  collectionHandle: string;
  onImport: (items: FileMetadata[]) => void;
  onClose: () => void;
}

type Step = "upload" | "mapping";

const AUTHOR_LIKE_FIELDS = new Set(["dc.contributor.author"]);

function SpreadsheetImporter({
  collectionHandle: defaultCollectionHandle,
  onImport,
  onClose,
}: SpreadsheetImporterProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [mappings, setMappings] = useState<MappingConfig[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importCollectionHandle, setImportCollectionHandle] = useState(defaultCollectionHandle);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    try {
      const result = await parseSpreadsheetFile(file);
      setParsed(result);
      setFileName(file.name);

      const autoMappings: MappingConfig[] = result.headers.map((h) => ({
        columnName: h,
        metadataField: autoMapColumn(h),
      }));
      setMappings(autoMappings);
      setStep("mapping");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setParseError(`Failed to parse file: ${msg}`);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleChangeFile = useCallback(() => {
    setParsed(null);
    setMappings([]);
    setFileName("");
    setStep("upload");
  }, []);

  const handleMappingChange = useCallback((columnName: string, field: string | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.columnName === columnName ? { ...m, metadataField: field } : m))
    );
  }, []);

  const previewItems = parsed && mappings.length > 0
    ? applyMapping(parsed, mappings, importCollectionHandle)
    : [];

  const requiredFields = ["dc.title", "dc.contributor.author", "dc.date.issued"];
  const warnings: string[] = [];

  if (parsed && mappings.length > 0) {
    const mappedRequired = mappings
      .filter((m) => m.metadataField && requiredFields.includes(m.metadataField))
      .map((m) => m.metadataField);

    const authorColumns = mappings
      .filter((m) => m.metadataField && AUTHOR_LIKE_FIELDS.has(m.metadataField))
      .map((m) => ({ name: m.columnName, idx: parsed.headers.indexOf(m.columnName) }));

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      for (const req of mappedRequired) {
        if (!req) continue;
        const colIdx = mappings.findIndex((m) => m.metadataField === req);
        if (colIdx !== -1 && (!row[colIdx] || row[colIdx].trim() === "")) {
          warnings.push(`Row ${i + 2}: missing ${req.replace("dc.", "")}`);
        }
      }
      for (const ac of authorColumns) {
        if (ac.idx === -1) continue;
        const val = row[ac.idx]?.trim() || "";
        if (val && /^\d+$/.test(val)) {
          warnings.push(`Row ${i + 2}: "${ac.name}" has numeric value "${val}" — skipped`);
        }
      }
    }
  }

  const mappedFields = mappings.filter((m) => m.metadataField);

  const handleImport = useCallback(() => {
    onImport(previewItems);
  }, [previewItems, onImport]);

  const allFields = ALL_FIELDS.map((f) => ({ header: f.header, label: f.label }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (step === "upload" && fileInputRef.current) {
      fileInputRef.current.focus();
    }
  }, [step]);

  return (
    <motion.div
      {...fadeIn}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="spreadsheet-importer-title"
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden border-border ring-0 gap-0 py-0"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-2.5">
          <h2 id="spreadsheet-importer-title" className="text-lg font-semibold">Import from Spreadsheet</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-6 py-2 text-xs text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted")}>1</span>
          <span>Upload</span>
          <span>→</span>
          <span className={cn("rounded-full px-2 py-0.5 font-medium", step === "mapping" ? "bg-primary text-primary-foreground" : "bg-muted")}>2</span>
          <span>Map & Preview</span>
        </div>

        <div className="overflow-y-auto px-6 py-3" style={{ maxHeight: "calc(90vh - 100px)" }}>
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div key="upload" {...fadeIn}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 px-6 py-16 transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {isParsing ? (
                    <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                  ) : (
                    <>
                      <Upload className="mb-4 size-10 text-muted-foreground/50" strokeWidth={1.5} aria-hidden="true" />
                      <p className="mb-2 text-sm font-medium">Click to upload CSV or Excel file</p>
                      <p className="text-xs text-muted-foreground">Supports .csv, .xlsx, .xls</p>
                    </>
                  )}
                </div>
                {parseError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription>{parseError}</AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}

            {step === "mapping" && parsed && (
              <motion.div key="mapping" {...fadeIn}>
                {parsed.warnings.length > 0 && (
                  <Alert variant="default" className="mb-3 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                        {parsed.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileSpreadsheet className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{fileName}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge className="h-5 gap-1 px-1.5 text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                          <Rows3 className="size-3" aria-hidden="true" />
                          {parsed.totalRows.toLocaleString()} rows
                        </Badge>
                        <Badge className="h-5 gap-1 px-1.5 text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                          <Columns3 className="size-3" aria-hidden="true" />
                          {parsed.headers.length} cols
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleChangeFile}>
                    Change file
                  </Button>
                </div>

                <div className="flex gap-4 items-start">
                  {/* Left column: Mapping */}
                  <div className="w-[380px] shrink-0 space-y-1">
                    <p className="text-sm font-medium mb-2">Column Mapping</p>

                    <div className="mb-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Collection Handle <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={importCollectionHandle}
                        onChange={(e) => setImportCollectionHandle(e.target.value)}
                        placeholder="e.g., 123456789/1"
                        className="h-8 text-xs"
                        required
                      />
                    </div>

                    {warnings.length > 0 && (
                      <Alert variant="destructive" className="mb-3">
                        <AlertTriangle aria-hidden="true" />
                        <AlertDescription>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                            {warnings.slice(0, 5).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                            {warnings.length > 5 && (
                              <li>... and {warnings.length - 5} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {mappings.map((mapping) => {
                      const isAuthorLike = mapping.metadataField && AUTHOR_LIKE_FIELDS.has(mapping.metadataField);
                      return (
                        <div key={mapping.columnName} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 text-xs text-muted-foreground" title={mapping.columnName}>
                            {mapping.columnName}
                            {isAuthorLike && (
                              <span className="ml-1 text-[10px] font-medium text-primary">(author)</span>
                            )}
                          </span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                          <SearchableSelect
                            value={mapping.metadataField || "__skip__"}
                            onValueChange={(val) =>
                              handleMappingChange(mapping.columnName, val === "__skip__" ? null : val)
                            }
                            options={[
                              { value: "__skip__", label: "Skip" },
                              ...allFields.map((f) => ({ value: f.header, label: `${f.label} (${f.header})` })),
                            ]}
                            className="w-[200px] shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Right column: Live Preview */}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-sm font-medium mb-3">Live Preview</p>
                    {mappedFields.length > 0 ? (
                      <div className="overflow-auto rounded-lg border border-border" style={{ height: "calc(90vh - 320px)" }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-background sticky top-0 z-10">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground bg-background">Item</th>
                              {mappedFields.map((m) => (
                                <th key={m.columnName} className="px-3 py-2 text-left font-medium text-muted-foreground bg-background">
                                  {m.metadataField}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewItems.map((item, ri) => (
                              <tr key={ri} className="border-b border-border last:border-0">
                                <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                                  {item.filename}
                                </td>
                                {mappedFields.map((m) => {
                                  const field = m.metadataField!;
                                  const entries = item.fields[field] || [];
                                  const val = entries.map((e) => e.value).join("; ");
                                  return (
                                    <td key={field} className="max-w-[200px] truncate px-3 py-1.5">
                                      {val || <span className="text-muted-foreground">—</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                        Map at least one column to see preview
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-2">
          {step === "mapping" ? (
            <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
              <ArrowLeft className="size-4 mr-1" aria-hidden="true" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step === "mapping" && (
            <Button size="sm" onClick={handleImport} disabled={previewItems.length === 0 || !importCollectionHandle.trim()}>
              <Check className="size-4 mr-1" aria-hidden="true" />
              Import {previewItems.length} item{previewItems.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export default SpreadsheetImporter;
