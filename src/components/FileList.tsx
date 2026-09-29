import { useState, useRef, useEffect, useMemo, memo } from "react";
import { motion } from "motion/react";
import { ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { getFileIcon } from "../utils/fileIcons";
import { hasRequiredFields } from "@/lib/csv-generator";
import type { FileMetadata } from "../types";

interface FileListProps {
  files: FileMetadata[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onCopyFrom: (fileIndex: number) => void;
}

function getStatusColor(file: FileMetadata): string {
  const fieldKeys = Object.keys(file.fields);
  if (fieldKeys.length === 0) return "bg-red-500";
  if (hasRequiredFields(file)) return "bg-emerald-500";
  const hasAny = fieldKeys.some((key) =>
    file.fields[key].some((e) => e.value.trim() !== "")
  );
  return hasAny ? "bg-amber-500" : "bg-red-500";
}

function getStatusLabel(file: FileMetadata): string {
  const fieldKeys = Object.keys(file.fields);
  if (fieldKeys.length === 0) return "No metadata";
  if (hasRequiredFields(file)) return "Required fields set";
  const hasAny = fieldKeys.some((key) =>
    file.fields[key].some((e) => e.value.trim() !== "")
  );
  return hasAny ? "Missing required fields" : "No metadata";
}

function FileList({ files, selectedIndex, onSelect, onCopyFrom }: FileListProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Single-pass computation for metadata state
  const { completedCount, copyableFiles } = useMemo(() => {
    let completed = 0;
    const copyable: { index: number; filename: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const hasMeta = Object.keys(files[i].fields).length > 0;
      if (hasMeta) {
        completed++;
        if (i !== selectedIndex) {
          copyable.push({ index: i, filename: files[i].filename });
        }
      }
    }
    return { completedCount: completed, copyableFiles: copyable };
  }, [files, selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopySelect = (sourceIndex: number) => {
    onCopyFrom(sourceIndex);
    setDropdownOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Files
        </h3>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto"
      >
        {files.map((file, index) => (
          <motion.div
            key={file.filePath}
            variants={staggerItem}
            role="button"
            tabIndex={0}
            aria-pressed={index === selectedIndex}
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(index);
              }
            }}
            className={`flex cursor-pointer items-center gap-2.5 border-l-2 px-4 py-2.5 transition-colors ${
              index === selectedIndex
                ? "border-l-primary bg-primary/5"
                : "border-l-transparent hover:bg-accent"
            }`}
          >
            <span
              role="img"
              aria-label={getStatusLabel(file)}
              className={`size-2 shrink-0 rounded-full ${getStatusColor(file)}`}
            />
            <svg
              className="size-4 shrink-0 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={getFileIcon(file.filename)} />
            </svg>
            <span className="truncate text-sm" title={file.filename}>
              {file.filename}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {files.length > 1 && copyableFiles.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <label className="text-xs font-medium text-muted-foreground">Copy from</label>
            </div>
            <div ref={dropdownRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                className="w-full justify-between text-xs font-normal"
              >
                <span className="truncate">Select source...</span>
                <ChevronDown
                  className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </Button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-border bg-background">
                  {copyableFiles.map((f) => (
                    <button
                      key={f.index}
                      onClick={() => handleCopySelect(f.index)}
                      className="w-full truncate px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                    >
                      {f.filename}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {completedCount} / {files.length} complete
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(FileList);
