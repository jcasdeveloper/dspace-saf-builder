//! DSpace SAF (Simple Archive Format) Package Builder.
//!
//! Exposes the [`generate_saf`] Tauri command, which organizes user files
//! into DSpace item directories with Dublin Core and custom-schema metadata,
//! then packages everything into a single ZIP archive for batch import.

use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::Path;

use anyhow::{bail, Context, Result};
use quick_xml::events::Event;
use quick_xml::Writer;
use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;

const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_COUNT: usize = 1000;

/// Default qualifier used when a metadata header has no qualifier segment.
const QUALIFIER_DEFAULT: &str = "none";

/// A parsed metadata field: `(element, qualifier, value)`.
type FieldTriple = (String, String, String);

/// Dublin Core fields alongside per-schema fields: `(dc_fields, schema_fields)`.
type ParsedFields = (Vec<FieldTriple>, HashMap<String, Vec<FieldTriple>>);

/// A single metadata value for a field.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MetadataEntry {
    value: String,
}

/// File metadata supplied by the frontend: bitstream plus its Dublin Core fields.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileMetadata {
    filename: String,
    file_path: String,
    fields: HashMap<String, Vec<MetadataEntry>>,
}

/// Project configuration for SAF generation: files plus output directory.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SafProject {
    files: Vec<FileMetadata>,
    output_dir: String,
}

/// Outcome of a successful SAF generation run.
#[derive(Serialize, Deserialize)]
struct GenerateResult {
    output_path: String,
    items_created: usize,
    zip_path: Option<String>,
    errors: Vec<String>,
}

/// Rejects empty names and path-traversal attempts (`/`, `\`, `..`).
fn validate_filename(name: &str) -> Result<()> {
    if name.is_empty() {
        bail!("Filename must not be empty");
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        bail!("Invalid filename (path traversal): {name}");
    }
    Ok(())
}

/// Rejects empty names and characters outside `[A-Za-z0-9_]`.
fn validate_schema(name: &str) -> Result<()> {
    if name.is_empty() {
        bail!("Schema name must not be empty");
    }
    if !name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        bail!("Invalid schema name: {name}");
    }
    Ok(())
}

/// Rejects headers without a dot or with segments outside `[A-Za-z0-9_-]`.
fn validate_header(header: &str) -> Result<()> {
    if header.is_empty() || !header.contains('.') {
        bail!("Invalid header format: {header}");
    }
    for part in header.split('.') {
        if part.is_empty() || !part.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
            bail!("Invalid header segment in: {header}");
        }
    }
    Ok(())
}

/// Validates file count, output directory, filenames, headers, and schema
/// names before any filesystem writes occur (fail fast).
fn validate_project(project: &SafProject) -> Result<()> {
    if project.files.len() > MAX_FILE_COUNT {
        bail!(
            "Too many files: {} exceeds limit of {MAX_FILE_COUNT}",
            project.files.len()
        );
    }

    if project.output_dir.is_empty() {
        bail!("Output directory must not be empty");
    }

    for file_metadata in &project.files {
        validate_filename(&file_metadata.filename)?;
        for header in file_metadata.fields.keys() {
            validate_header(header)?;
            // Validate schema names upfront — fail fast instead of silently
            // skipping fields mid-loop (validate_schema rejects hyphens)
            if !header.starts_with("dc.") && header.contains('.') {
                let schema = header.split('.').next().unwrap_or("");
                validate_schema(schema)?;
            }
        }
    }

    Ok(())
}

/// Returns the canonical SAF item directory name for a zero-based index.
fn item_dir_name(idx: usize) -> String {
    format!("item_{idx:03}")
}

/// Splits a file's raw metadata map into Dublin Core fields and per-schema
/// fields. Empty values are skipped. Returns `(dc_fields, schema_fields)`.
fn parse_item_fields(
    fields: &HashMap<String, Vec<MetadataEntry>>,
) -> ParsedFields {
    let mut dc_fields: Vec<FieldTriple> = Vec::new();
    let mut schema_fields: HashMap<String, Vec<FieldTriple>> = HashMap::new();

    for (header, entries) in fields {
        for entry in entries {
            // Skip empties before cloning — avoids heap alloc for discarded values
            if entry.value.is_empty() {
                continue;
            }
            let value = entry.value.clone();

            if let Some(rest) = header.strip_prefix("dc.") {
                let (element, qualifier_opt) = rest.split_once('.').unwrap_or((rest, ""));
                let element = element.to_string();
                if element.is_empty()
                    || !element
                        .chars()
                        .all(|c| c.is_alphanumeric() || c == '_' || c == '-')
                {
                    continue;
                }
                let qualifier = if !qualifier_opt.is_empty() {
                    qualifier_opt.to_string()
                } else {
                    QUALIFIER_DEFAULT.to_string()
                };
                dc_fields.push((element, qualifier, value));
            } else if header.contains('.') {
                let mut parts = header.splitn(3, '.');
                let schema = parts.next().unwrap_or("unknown").to_string();
                let element = parts.next().unwrap_or(QUALIFIER_DEFAULT).to_string();
                let qualifier = parts.next().unwrap_or(QUALIFIER_DEFAULT).to_string();
                schema_fields
                    .entry(schema)
                    .or_default()
                    .push((element, qualifier, value));
            }
        }
    }

    (dc_fields, schema_fields)
}

/// Copies one file into its SAF item directory and writes its metadata XML.
/// Returns the item on success; pushes non-fatal issues into `errors` and
/// returns `None` for skipped files (missing or oversized source).
fn process_item(
    file_metadata: &FileMetadata,
    item_dir: &Path,
    errors: &mut Vec<String>,
) -> Result<bool> {
    let src = Path::new(&file_metadata.file_path);
    if src.exists() {
        // Check file size before copying
        if let Ok(meta) = fs::metadata(src) {
            if meta.len() > MAX_FILE_SIZE {
                errors.push(format!(
                    "File too large (>100 MB), skipped: {}",
                    file_metadata.filename
                ));
                return Ok(false);
            }
        }

        let dst = item_dir.join(&file_metadata.filename);
        fs::copy(src, &dst)
            .with_context(|| format!("Failed to copy file: {}", file_metadata.filename))?;

        let contents_file = item_dir.join("contents");
        let mut f =
            fs::File::create(&contents_file).context("Failed to create contents file")?;
        writeln!(f, "{}", file_metadata.filename).context("Failed to write contents file")?;
    } else {
        errors.push(format!("File not found: {}", file_metadata.filename));
    }

    let (dc_fields, schema_fields) = parse_item_fields(&file_metadata.fields);

    if !dc_fields.is_empty() {
        write_dublin_core(item_dir, &dc_fields)?;
    }

    for (schema, fields) in &schema_fields {
        write_schema_metadata(item_dir, schema, fields)?;
    }

    Ok(true)
}

/// Zips every `item_NNN` directory under `output_path` into `saf_package.zip`.
fn create_saf_zip(output_path: &Path, items_created: usize) -> Result<std::path::PathBuf> {
    let zip_file_path = output_path.join("saf_package.zip");
    let zip_file = fs::File::create(&zip_file_path).context("Failed to create ZIP file")?;

    let mut zip = zip::ZipWriter::new(zip_file);
    let options =
        SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for idx in 0..items_created {
        let name = item_dir_name(idx);
        let item_dir = output_path.join(&name);

        if item_dir.exists() {
            add_dir_to_zip(&mut zip, &item_dir, &name, &options)?;
        }
    }

    zip.finish().context("Failed to finalize ZIP file")?;

    Ok(zip_file_path)
}

/// Removes the temporary `item_NNN` directories. Failures are logged to
/// stderr but not fatal — stale dirs are harmless on the next run.
fn cleanup_item_dirs(output_path: &Path, items_created: usize) {
    for idx in 0..items_created {
        let item_dir = output_path.join(item_dir_name(idx));
        if item_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&item_dir) {
                eprintln!(
                    "Warning: failed to clean up {}: {e}",
                    item_dir.display()
                );
            }
        }
    }
}

/// Generates a DSpace SAF package from the provided project configuration.
///
/// Creates `item_NNN` directories with copied bitstreams, Dublin Core and
/// custom-schema metadata XML, then bundles everything into `saf_package.zip`
/// and removes the temporary directories.
///
/// Returns a [`GenerateResult`] with the output path, item count, ZIP path,
/// and any non-fatal per-file errors. Fatal errors (invalid input, I/O
/// failures) are returned as `Err` and surface to the frontend as a string.
#[tauri::command]
fn generate_saf(project: SafProject) -> std::result::Result<GenerateResult, String> {
    // Tauri commands require a serializable error type; anyhow carries the
    // full context chain internally and is flattened here at the boundary.
    generate_saf_inner(project).map_err(|e| format!("{e:#}"))
}

/// Inner implementation of [`generate_saf`]. Uses `anyhow::Result` for
/// ergonomic error propagation; the Tauri command wrapper converts to `String`.
fn generate_saf_inner(project: SafProject) -> Result<GenerateResult> {
    validate_project(&project)?;

    let mut errors = Vec::new();
    let output_path = Path::new(&project.output_dir);

    fs::create_dir_all(output_path).context("Failed to create output directory")?;

    let mut items_created: usize = 0;

    for file_metadata in project.files.iter() {
        // Name dirs sequentially by creation order (not file index) so the
        // 0..items_created ZIP/cleanup loops below always match. A skipped
        // file must not leave a gap that drops later items from the ZIP.
        let item_dir = output_path.join(item_dir_name(items_created));

        fs::create_dir_all(&item_dir).context("Failed to create item directory")?;

        if process_item(file_metadata, &item_dir, &mut errors)? {
            items_created += 1;
        }
    }

    let zip_file_path = create_saf_zip(output_path, items_created)?;

    cleanup_item_dirs(output_path, items_created);

    Ok(GenerateResult {
        output_path: project.output_dir,
        items_created,
        zip_path: Some(zip_file_path.to_string_lossy().to_string()),
        errors,
    })
}

/// Writes a `dublin_core.xml` (or `metadata_<schema>.xml`) file into an item
/// directory from `(element, qualifier, value)` triples.
fn write_metadata_xml(
    item_dir: &Path,
    file_name: &str,
    fields: &[FieldTriple],
    schema_attr: Option<&str>,
) -> Result<()> {
    let file_path = item_dir.join(file_name);
    let mut writer = Writer::new_with_indent(Vec::new(), b' ', 2);

    writer
        .write_event(Event::Decl(quick_xml::events::BytesDecl::new(
            "1.0",
            Some("UTF-8"),
            None,
        )))
        .map_err(|e| anyhow::anyhow!("XML declaration write failed: {e}"))?;

    let mut root = quick_xml::events::BytesStart::new("dublin_core");
    if let Some(schema) = schema_attr {
        root.push_attribute(("schema", schema));
    }
    writer
        .write_event(Event::Start(root))
        .map_err(|e| anyhow::anyhow!("XML root write failed: {e}"))?;

    for (element, qualifier, value) in fields {
        let mut elem = quick_xml::events::BytesStart::new("dcvalue");
        elem.push_attribute(("element", element.as_str()));
        elem.push_attribute(("qualifier", qualifier.as_str()));

        writer
            .write_event(Event::Start(elem))
            .map_err(|e| anyhow::anyhow!("XML element write failed: {e}"))?;
        writer
            .write_event(Event::Text(quick_xml::events::BytesText::new(value)))
            .map_err(|e| anyhow::anyhow!("XML text write failed: {e}"))?;
        writer
            .write_event(Event::End(quick_xml::events::BytesEnd::new("dcvalue")))
            .map_err(|e| anyhow::anyhow!("XML element close failed: {e}"))?;
    }

    writer
        .write_event(Event::End(quick_xml::events::BytesEnd::new("dublin_core")))
        .map_err(|e| anyhow::anyhow!("XML root close failed: {e}"))?;

    let mut f = fs::File::create(&file_path).context("Failed to create metadata file")?;
    let bytes = writer.into_inner();
    f.write_all(&bytes)
        .context("Failed to write metadata file")?;

    Ok(())
}

/// Writes `dublin_core.xml` into an item directory.
fn write_dublin_core(item_dir: &Path, fields: &[FieldTriple]) -> Result<()> {
    write_metadata_xml(item_dir, "dublin_core.xml", fields, None)
}

/// Writes `metadata_<schema>.xml` into an item directory.
fn write_schema_metadata(item_dir: &Path, schema: &str, fields: &[FieldTriple]) -> Result<()> {
    let file_name = format!("metadata_{schema}.xml");
    write_metadata_xml(item_dir, &file_name, fields, Some(schema))
}

/// Streams every file in `dir` into the ZIP writer under `prefix/`.
/// Files are read in 8 KB chunks — constant memory regardless of file size.
fn add_dir_to_zip(
    zip: &mut zip::ZipWriter<fs::File>,
    dir: &Path,
    prefix: &str,
    options: &SimpleFileOptions,
) -> Result<()> {
    let entries = fs::read_dir(dir).context("Failed to read directory")?;

    for entry in entries {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let zip_name = format!("{prefix}/{name}");

        if path.is_file() {
            let mut f = fs::File::open(&path).context("Failed to open file for ZIP")?;
            // Check file size to prevent OOM
            if let Ok(meta) = f.metadata() {
                if meta.len() > MAX_FILE_SIZE {
                    bail!("File too large for ZIP: {name}");
                }
            }
            zip.start_file(&zip_name, *options)
                .context("Failed to start ZIP entry")?;
            // Stream via 8 KB buffer — constant memory regardless of file size
            let mut buf = [0u8; 8192];
            loop {
                let n = f.read(&mut buf).context("Failed to read file during ZIP")?;
                if n == 0 {
                    break;
                }
                zip.write_all(&buf[..n])
                    .context("Failed to write to ZIP")?;
            }
        }
    }

    Ok(())
}

/// Writes a DSpace batch metadata CSV to the output directory.
/// Returns the path to the written file.
#[tauri::command]
fn generate_metadata_csv(csv_content: String, output_dir: String) -> std::result::Result<String, String> {
    generate_metadata_csv_inner(csv_content, output_dir).map_err(|e| format!("{e:#}"))
}

/// Inner implementation of [`generate_metadata_csv`]. Writes the CSV content
/// to `<output_dir>/dspace_metadata_import.csv`.
fn generate_metadata_csv_inner(csv_content: String, output_dir: String) -> Result<String> {
    let path = std::path::Path::new(&output_dir).join("dspace_metadata_import.csv");
    std::fs::write(&path, &csv_content).context("Failed to write metadata CSV")?;
    Ok(path.to_string_lossy().to_string())
}

/// Launches the Tauri application with the opener/dialog plugins and the
/// [`generate_saf`] command handler.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![generate_saf, generate_metadata_csv])
        .run(tauri::generate_context!())
        // SAFETY: Tauri's `run()` never returns `Ok`; there is no meaningful
        // recovery at the process entry point, so panicking is acceptable.
        .expect("error while running tauri application");
}

#[cfg(test)]
mod validate_filename_tests {
    use super::*;

    #[test]
    fn rejects_empty_name() {
        assert!(validate_filename("").is_err());
    }

    #[test]
    fn rejects_forward_slash() {
        assert!(validate_filename("sub/dir.pdf").is_err());
    }

    #[test]
    fn rejects_backslash() {
        assert!(validate_filename("sub\\dir.pdf").is_err());
    }

    #[test]
    fn rejects_parent_traversal() {
        assert!(validate_filename("../secret.pdf").is_err());
    }

    #[test]
    fn accepts_plain_filename() {
        assert!(validate_filename("document.pdf").is_ok());
    }

    #[test]
    fn accepts_dotted_filename() {
        assert!(validate_filename("my.paper.v2.pdf").is_ok());
    }
}

#[cfg(test)]
mod validate_schema_tests {
    use super::*;

    #[test]
    fn rejects_empty_schema() {
        assert!(validate_schema("").is_err());
    }

    #[test]
    fn rejects_hyphen() {
        assert!(validate_schema("my-schema").is_err());
    }

    #[test]
    fn rejects_dot() {
        assert!(validate_schema("my.schema").is_err());
    }

    #[test]
    fn accepts_alphanumeric_and_underscore() {
        assert!(validate_schema("thesis_v2").is_ok());
    }

    #[test]
    fn accepts_dc() {
        assert!(validate_schema("dc").is_ok());
    }
}

#[cfg(test)]
mod validate_header_tests {
    use super::*;

    #[test]
    fn rejects_empty_header() {
        assert!(validate_header("").is_err());
    }

    #[test]
    fn rejects_header_without_dot() {
        assert!(validate_header("title").is_err());
    }

    #[test]
    fn rejects_empty_segment() {
        assert!(validate_header("dc..title").is_err());
    }

    #[test]
    fn accepts_dc_header() {
        assert!(validate_header("dc.title").is_ok());
    }

    #[test]
    fn accepts_qualified_header() {
        assert!(validate_header("dc.contributor.author").is_ok());
    }

    #[test]
    fn accepts_custom_schema_header() {
        assert!(validate_header("thesis.degree.name").is_ok());
    }

    #[test]
    fn accepts_hyphen_and_underscore_segments() {
        assert!(validate_header("local.my-field_name").is_ok());
    }
}

#[cfg(test)]
mod parse_item_fields_tests {
    use super::*;

    fn entries(values: &[&str]) -> Vec<MetadataEntry> {
        values
            .iter()
            .map(|v| MetadataEntry {
                value: v.to_string(),
            })
            .collect()
    }

    #[test]
    fn splits_dc_and_schema_fields() {
        let mut fields = HashMap::new();
        fields.insert("dc.title".to_string(), entries(&["My Paper"]));
        fields.insert("thesis.degree.name".to_string(), entries(&["PhD"]));

        let (dc, schemas) = parse_item_fields(&fields);

        assert_eq!(dc.len(), 1);
        assert_eq!(dc[0], ("title".to_string(), "none".to_string(), "My Paper".to_string()));
        assert_eq!(schemas.len(), 1);
        let thesis = &schemas["thesis"];
        assert_eq!(
            thesis[0],
            ("degree".to_string(), "name".to_string(), "PhD".to_string())
        );
    }

    #[test]
    fn skips_empty_values_without_cloning() {
        let mut fields = HashMap::new();
        fields.insert("dc.title".to_string(), entries(&["", "Real Title"]));

        let (dc, _) = parse_item_fields(&fields);

        assert_eq!(dc.len(), 1);
        assert_eq!(dc[0].2, "Real Title");
    }

    #[test]
    fn parses_qualified_dc_header() {
        let mut fields = HashMap::new();
        fields.insert("dc.contributor.author".to_string(), entries(&["Jane Doe"]));

        let (dc, _) = parse_item_fields(&fields);

        assert_eq!(
            dc[0],
            ("contributor".to_string(), "author".to_string(), "Jane Doe".to_string())
        );
    }
}
