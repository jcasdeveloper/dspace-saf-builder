import { memo } from "react";
import { motion } from "motion/react";
import { open } from "@tauri-apps/plugin-dialog";
import { ChevronLeft, ChevronRight, FolderOpen, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import { fadeIn } from "@/lib/animations";
import { getFileIcon, getFileColor, getFileExtension } from "../utils/fileIcons";
import type { FileMetadata } from "../types";

interface FilePickerProps {
  files: FileMetadata[];
  onFilesChange: (files: FileMetadata[]) => void;
  onContinue: () => void;
  onBack: () => void;
  onToast: (message: string) => void;
}

function FilePicker({ files, onFilesChange, onContinue, onBack, onToast }: FilePickerProps) {
  const handleSelectFiles = async () => {
    const selectedPaths = await open({ multiple: true });
    if (!selectedPaths) return;

    const paths = Array.isArray(selectedPaths) ? selectedPaths : [selectedPaths];
    const existingPaths = new Set(files.map((f) => f.filePath));
    const newPaths = paths.filter((p) => !existingPaths.has(p));
    const duplicateCount = paths.length - newPaths.length;

    if (duplicateCount > 0) {
      onToast(`${duplicateCount} file(s) already added and were skipped`);
    }

    if (newPaths.length === 0) return;

    const newFiles: FileMetadata[] = newPaths.map((p) => ({
      filename: p.split(/[\\/]/).pop() || "",
      filePath: p,
      fields: {},
    }));

    onFilesChange([...files, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    onFilesChange([]);
  };

  return (
    <motion.div {...fadeIn}>
      <Card className={cn("ring-0", files.length > 0 && "border-border")}>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-16">
              <FolderOpen
                className="mb-4 size-12 text-muted-foreground/50"
                strokeWidth={1}
                aria-hidden="true"
              />
              <p className="mb-6 text-sm text-muted-foreground">No files selected yet</p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={handleSelectFiles} size="lg">
                  <Plus aria-hidden="true" />
                  Select Files
                </Button>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {files.length} {files.length === 1 ? "file" : "files"} selected
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={handleSelectFiles}>
                    <Plus aria-hidden="true" />
                    Add more
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-destructive hover:text-destructive">
                    <Trash2 aria-hidden="true" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {files.map((file, index) => (
                  <div
                    key={file.filePath}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <svg
                      className={`size-5 shrink-0 ${getFileColor(file.filename)}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={getFileIcon(file.filename)} />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {getFileExtension(file.filename)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveFile(index)}
                      aria-label={`Remove ${file.filename}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>

              <motion.div whileTap={{ scale: 0.98 }}>
                <Button onClick={onContinue} className="w-full" size="lg">
                  Continue
                  <ChevronRight aria-hidden="true" />
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-3 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4 mr-1" aria-hidden="true" />
          Back to home
        </Button>
      </div>
    </motion.div>
  );
}

export default memo(FilePicker);
