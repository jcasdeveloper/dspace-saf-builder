import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Plus, TriangleAlert, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { collapse, fadeIn } from "@/lib/animations";
import { hasRequiredFields } from "@/lib/csv-generator";
import { useFieldChange } from "@/lib/useFieldChange";
import type { FileMetadata } from "../types";
import FieldEditor from "./FieldEditor";
import SpreadsheetImporter from "./SpreadsheetImporter";

function getItemStatus(item: FileMetadata): "empty" | "incomplete" | "complete" {
  const fieldKeys = Object.keys(item.fields);
  if (fieldKeys.length === 0) return "empty";
  if (hasRequiredFields(item)) return "complete";
  const hasAnyValue = fieldKeys.some((key) =>
    item.fields[key].some((e) => e.value.trim() !== "")
  );
  return hasAnyValue ? "incomplete" : "empty";
}

function statusColor(status: "empty" | "incomplete" | "complete"): string {
  if (status === "complete") return "bg-emerald-500";
  if (status === "incomplete") return "bg-amber-500";
  return "bg-red-500";
}

interface CsvMetadataEditorProps {
  files: FileMetadata[];
  onFilesChange: (files: FileMetadata[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

function CsvMetadataEditor({ files, onFilesChange, onBack, onContinue }: CsvMetadataEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);

  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const handleImportItems = useCallback((items: FileMetadata[]) => {
    const nonEmpty = filesRef.current.filter((f) => Object.keys(f.fields).length > 0);
    onFilesChange([...nonEmpty, ...items]);
    // Defer modal close to next frame to ensure state is committed before unmount
    requestAnimationFrame(() => setShowImporter(false));
  }, [onFilesChange]);

  const handleAddItem = useCallback(() => {
    const newItem: FileMetadata = {
      filename: `Item ${files.length + 1}`,
      filePath: "",
      fields: {},
    };
    const updated = [...files, newItem];
    onFilesChange(updated);
    setSelectedIndex(updated.length - 1);
  }, [files, onFilesChange]);

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (files.length <= 1) return;
      const updated = files.filter((_, i) => i !== index);
      onFilesChange(updated);
      if (selectedIndex >= updated.length) {
        setSelectedIndex(updated.length - 1);
      } else if (selectedIndex > index) {
        setSelectedIndex(selectedIndex - 1);
      }
    },
    [files, selectedIndex, onFilesChange]
  );

  const handleFieldChange = useFieldChange(files, selectedIndex, onFilesChange);

  const { itemsComplete, itemsTotal } = useMemo(() => {
    const complete = files.filter((f) => getItemStatus(f) === "complete").length;
    return { itemsComplete: complete, itemsTotal: files.length };
  }, [files, getItemStatus]);

  const handleCollectionChange = useCallback(
    (value: string) => {
      const updatedFiles = [...files];
      updatedFiles[selectedIndex] = { ...updatedFiles[selectedIndex], collectionHandle: value };
      onFilesChange(updatedFiles);
    },
    [files, selectedIndex, onFilesChange]
  );

  const handleContinue = useCallback(() => {
    const missingCollection = files.filter((f) => !f.collectionHandle?.trim());
    if (missingCollection.length > 0) {
      const names = missingCollection.map((f) => f.filename).join(", ");
      setValidationError(`Collection handle is required for: ${names}`);
      const firstMissing = files.findIndex((f) => !f.collectionHandle?.trim());
      if (firstMissing !== -1) setSelectedIndex(firstMissing);
      return;
    }
    const incompleteItems = files.filter((f) => getItemStatus(f) !== "complete");
    if (incompleteItems.length > 0) {
      const names = incompleteItems.map((f) => f.filename).join(", ");
      setValidationError(
        `${incompleteItems.length} item(s) missing required fields (title, author, date): ${names}`
      );
      const firstIncomplete = files.findIndex((f) => getItemStatus(f) !== "complete");
      if (firstIncomplete !== -1) setSelectedIndex(firstIncomplete);
      return;
    }
    setValidationError(null);
    onContinue();
  }, [files, getItemStatus, onContinue]);

  return (
    <motion.div {...fadeIn}>
      <Card className="overflow-hidden border-border py-0 gap-0 ring-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to mode selection">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <h2 className="text-sm font-medium">CSV Metadata Editor</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleContinue}
            aria-label="Continue to generate CSV"
            className="text-primary hover:text-primary"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {validationError && (
            <motion.div
              {...collapse}
              className="overflow-hidden border-b border-border"
              key="validation-error"
            >
              <div className="px-4 py-3">
                <Alert variant="destructive">
                  <TriangleAlert aria-hidden="true" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-[clamp(320px,60vh,600px)]">
          <div className="w-64 shrink-0 border-r border-border bg-card">
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                {files.map((file, index) => {
                  const status = getItemStatus(file);
                  return (
                    <div
                      key={file.filePath || index}
                      role="button"
                      tabIndex={0}
                      aria-pressed={index === selectedIndex}
                      onClick={() => setSelectedIndex(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedIndex(index);
                        }
                      }}
                      className={`group flex cursor-pointer items-center gap-2 border-l-2 px-4 py-2.5 transition-colors ${
                        index === selectedIndex
                          ? "border-l-primary bg-primary/5"
                          : "border-l-transparent hover:bg-accent"
                      }`}
                    >
                      <span
                        role="img"
                        aria-label={`Status: ${status}`}
                        className={`size-2 shrink-0 rounded-full ${statusColor(status)}`}
                      />
                      <span className="flex-1 truncate text-sm">{file.filename}</span>
                      {files.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(index);
                          }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label={`Remove ${file.filename}`}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="w-full"
                >
                  <Plus className="size-4 mr-1.5" aria-hidden="true" />
                  Add Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImporter(true)}
                  className="w-full"
                >
                  <FileSpreadsheet className="size-4 mr-1.5" aria-hidden="true" />
                  Import from Spreadsheet
                </Button>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="border-b border-border px-4 py-3">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="collection-handle">
                Collection Handle <span className="text-destructive">*</span>
              </label>
              <Input
                id="collection-handle"
                value={files[selectedIndex]?.collectionHandle || ""}
                onChange={(e) => handleCollectionChange(e.target.value)}
                placeholder="e.g., 123456789/1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                DSpace collection handle for this item
              </p>
            </div>
            {files[selectedIndex] && (
              <FieldEditor file={files[selectedIndex]} onFieldChange={handleFieldChange} />
            )}
          </div>
        </div>

        <CardFooter className="border-t border-border bg-muted/50 px-6 py-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {itemsComplete < itemsTotal
              ? `${itemsComplete} of ${itemsTotal} items have required fields set`
              : `${itemsTotal} item${itemsTotal !== 1 ? "s" : ""} — all required fields complete`}
          </p>
        </CardFooter>
      </Card>

      {showImporter && (
        <SpreadsheetImporter
          collectionHandle={files[selectedIndex]?.collectionHandle || ""}
          onImport={handleImportItems}
          onClose={() => setShowImporter(false)}
        />
      )}
    </motion.div>
  );
}

export default memo(CsvMetadataEditor);
