export interface MetadataEntry {
  value: string;
}

export interface FileMetadata {
  filename: string;
  filePath: string;
  fields: Record<string, MetadataEntry[]>;
  collectionHandle?: string;
}

export interface GenerateResult {
  output_path: string;
  items_created: number;
  zip_path: string | null;
  errors: string[];
}

export type OutputMode = "saf-zip" | "metadata-csv";

export type AppStep =
  | "welcome"
  | "select"
  | "metadata"
  | "generate"
  | "csv-metadata"
  | "csv-generate"
  | "done"
  | "docs";

export interface MappingConfig {
  columnName: string;
  metadataField: string | null;
}
