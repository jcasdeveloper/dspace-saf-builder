import { useCallback } from "react";
import type { FileMetadata, MetadataEntry } from "../types";

export function useFieldChange(
  files: FileMetadata[],
  selectedIndex: number,
  onFilesChange: (files: FileMetadata[]) => void
) {
  return useCallback(
    (header: string, values: MetadataEntry[]) => {
      const updatedFiles = [...files];
      const file = { ...updatedFiles[selectedIndex] };
      const fields = { ...file.fields };

      if (values.length === 0) {
        delete fields[header];
      } else {
        fields[header] = values;
      }

      file.fields = fields;
      updatedFiles[selectedIndex] = file;
      onFilesChange(updatedFiles);
    },
    [files, selectedIndex, onFilesChange]
  );
}
