import { useMemo, useCallback, memo } from "react";
import { motion } from "motion/react";
import { FilePenLine, Tags } from "lucide-react";
import type { FileMetadata, MetadataEntry } from "../types";
import { fadeIn } from "@/lib/animations";
import FieldSearchBar from "./FieldSearchBar";
import FieldRow from "./FieldRow";

interface FieldEditorProps {
  file: FileMetadata;
  onFieldChange: (header: string, values: MetadataEntry[]) => void;
}

function FieldEditor({ file, onFieldChange }: FieldEditorProps) {
  const usedHeaders = useMemo(() => Object.keys(file.fields), [file.fields]);

  const handleAddField = useCallback(
    (header: string) => {
      if (!file.fields[header]) {
        onFieldChange(header, [{ value: "" }]);
      }
    },
    [file.fields, onFieldChange]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-3.5">
        <div className="flex items-center gap-2">
          <FilePenLine className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h3 className="truncate text-sm font-medium">
            <span className="font-normal text-muted-foreground">Editing</span>{" "}
            <span className="font-mono font-medium text-primary">{file.filename}</span>
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <FieldSearchBar usedHeaders={usedHeaders} onAddField={handleAddField} />

        {usedHeaders.length === 0 ? (
          <motion.div {...fadeIn} className="py-16 text-center">
            <Tags
              className="mx-auto mb-3 size-10 text-muted-foreground/40"
              strokeWidth={1}
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">Search above to add metadata fields</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {usedHeaders.map((header) => (
              <FieldRow
                key={header}
                header={header}
                values={file.fields[header] || []}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FieldEditor);
