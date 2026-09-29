import { useState, useMemo, useCallback, memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { collapse, fadeIn } from "@/lib/animations";
import { hasRequiredFields } from "@/lib/csv-generator";
import { useFieldChange } from "@/lib/useFieldChange";
import type { FileMetadata } from "../types";
import FileList from "./FileList";
import FieldEditor from "./FieldEditor";

interface MetadataEditorProps {
  files: FileMetadata[];
  onFilesChange: (files: FileMetadata[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

function MetadataEditor({ files, onFilesChange, onBack, onContinue }: MetadataEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFieldChange = useFieldChange(files, selectedIndex, onFilesChange);

  const handleCopyFrom = useCallback(
    (sourceIndex: number) => {
      const sourceFile = files[sourceIndex];
      const updatedFiles = [...files];
      const targetFile = { ...updatedFiles[selectedIndex] };

      targetFile.fields = { ...sourceFile.fields };
      updatedFiles[selectedIndex] = targetFile;
      onFilesChange(updatedFiles);
    },
    [files, selectedIndex, onFilesChange]
  );

  const { filesWithoutMetadata, filesWithMetadata } = useMemo(() => {
    const without = files.filter((f) => !hasRequiredFields(f));
    return { filesWithoutMetadata: without, filesWithMetadata: files.length - without.length };
  }, [files]);

  const handleContinue = useCallback(() => {
    if (filesWithoutMetadata.length > 0) {
      const names = filesWithoutMetadata.map((f) => f.filename).join(", ");
      setValidationError(
        `${filesWithoutMetadata.length} file(s) missing required fields (title, author, date): ${names}`
      );
      const firstIncomplete = files.findIndex((f) => !hasRequiredFields(f));
      if (firstIncomplete !== -1) setSelectedIndex(firstIncomplete);
      return;
    }
    setValidationError(null);
    onContinue();
  }, [files, filesWithoutMetadata, onContinue]);

  return (
    <motion.div {...fadeIn}>
      <Card className="overflow-hidden border-border py-0 gap-0 ring-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to file selection">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <h2 className="text-sm font-medium">Metadata Editor</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleContinue}
            aria-label="Continue to generate"
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
            <FileList
              files={files}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onCopyFrom={handleCopyFrom}
            />
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {files[selectedIndex] && (
              <FieldEditor file={files[selectedIndex]} onFieldChange={handleFieldChange} />
            )}
          </div>
        </div>

        <CardFooter className="border-t border-border bg-muted/50 px-6 py-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {filesWithoutMetadata.length > 0
              ? `${filesWithMetadata} of ${files.length} files complete \u2014 ${filesWithoutMetadata.length} need metadata`
              : `${filesWithMetadata} of ${files.length} files have metadata set`}
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default memo(MetadataEditor);
