import { Suspense, lazy, useRef, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { revealItemInDir, openPath } from "@tauri-apps/plugin-opener";
import { CircleCheck, ExternalLink, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { scaleIn, screenSlide } from "@/lib/animations";
import { generateMetadataCsv } from "@/lib/csv-generator";
import Header from "./components/Header";
import StepIndicator from "./components/StepIndicator";
import ModeSelector from "./components/ModeSelector";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import UpdateDialog from "./components/UpdateDialog";
import { ThemeProvider } from "./components/theme-provider";
import { version } from "../package.json";
import type { FileMetadata, GenerateResult, AppStep, OutputMode } from "./types";

// Lazy-load step screens — only one is visible at a time
const FilePicker = lazy(() => import("./components/FilePicker"));
const MetadataEditor = lazy(() => import("./components/MetadataEditor"));
const ProgressPanel = lazy(() => import("./components/ProgressPanel"));
const CsvMetadataEditor = lazy(() => import("./components/CsvMetadataEditor"));
const CsvProgressPanel = lazy(() => import("./components/CsvProgressPanel"));
const Documentation = lazy(() => import("./components/Documentation"));

const SAF_STEP_ORDER: AppStep[] = ["select", "metadata", "generate", "done", "docs"];
const CSV_STEP_ORDER: AppStep[] = ["csv-metadata", "csv-generate", "done", "docs"];

function App() {
  const [step, setStep] = useState<AppStep>("welcome");
  const prevStepRef = useRef<AppStep>("welcome");
  const [direction, setDirection] = useState(1);
  const [outputMode, setOutputMode] = useState<OutputMode | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const showToast = useCallback((msg: string) => setToastMsg(msg), []);

  const checkForUpdates = useCallback(
    async (manual: boolean) => {
      setCheckingUpdate(true);
      try {
        const found = await check();
        if (found) {
          setPendingUpdate(found);
          setUpdateDialogOpen(true);
        } else if (manual) {
          showToast(`You're up to date (v${version})`);
        }
      } catch (err) {
        console.error("Update check failed:", err);
        if (manual) showToast("Could not check for updates — try again later");
      } finally {
        setCheckingUpdate(false);
      }
    },
    [showToast]
  );

  // Silent update check on launch
  useEffect(() => {
    void checkForUpdates(false);
  }, [checkForUpdates]);

  const handleUpdatesClick = useCallback(() => {
    void checkForUpdates(true);
  }, [checkForUpdates]);

  const goToStep = useCallback((from: AppStep, to: AppStep) => {
    const order = stepOrder;
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    setDirection(toIdx > fromIdx ? 1 : -1);
    setStep(to);
  }, [outputMode]);

  const stepOrder = outputMode === "metadata-csv" ? CSV_STEP_ORDER : SAF_STEP_ORDER;

  const handleDocsClick = useCallback(() => {
    prevStepRef.current = step;
    goToStep(step, "docs");
  }, [step, goToStep]);

  const handleDocsClose = useCallback(() => goToStep("docs", prevStepRef.current), [goToStep]);

  const handleModeSelect = useCallback((mode: OutputMode) => {
    setOutputMode(mode);
    setFiles([]);
    setResult(null);
    if (mode === "saf-zip") {
      setDirection(1);
      setStep("select");
    } else {
      setFiles([{ filename: "Item 1", filePath: "", fields: {} }]);
      setDirection(1);
      setStep("csv-metadata");
    }
  }, []);

  // SAF ZIP flow handlers
  const handleSelectContinue = useCallback(() => goToStep("select", "metadata"), [goToStep]);
  const handleSelectBack = useCallback(() => goToStep("select", "welcome"), [goToStep]);
  const handleMetadataBack = useCallback(() => goToStep("metadata", "select"), [goToStep]);
  const handleMetadataContinue = useCallback(() => goToStep("metadata", "generate"), [goToStep]);
  const handleGenerateBack = useCallback(() => goToStep("generate", "metadata"), [goToStep]);

  const handleGenerate = useCallback(
    async (outputDir: string) => {
      const project = { files, outputDir };
      const generateResult = await invoke<GenerateResult>("generate_saf", { project });
      setResult(generateResult);
      goToStep("generate", "done");
    },
    [files, goToStep]
  );

  // CSV flow handlers
  const handleCsvBack = useCallback(() => goToStep("csv-metadata", "welcome"), [goToStep]);
  const handleCsvContinue = useCallback(() => goToStep("csv-metadata", "csv-generate"), [goToStep]);
  const handleCsvGenerateBack = useCallback(() => goToStep("csv-generate", "csv-metadata"), [goToStep]);

  const handleCsvGenerate = useCallback(
    async (outputDir: string) => {
      const csvContent = generateMetadataCsv(files);
      const csvPath = await invoke<string>("generate_metadata_csv", {
        csvContent,
        outputDir,
      });
      setResult({
        output_path: csvPath,
        items_created: files.length,
        zip_path: null,
        errors: [],
      });
      goToStep("csv-generate", "done");
    },
    [files, goToStep]
  );

  const handleStartOver = useCallback(() => {
    setOutputMode(null);
    setStep("welcome");
    setFiles([]);
    setResult(null);
  }, []);

  const handleOpenOutput = useCallback(async () => {
    const revealPath = result?.zip_path || result?.output_path;
    if (revealPath) {
      try {
        await revealItemInDir(revealPath);
      } catch {
        try {
          await openPath(revealPath);
        } catch (err) {
          console.error("Failed to open folder:", err);
        }
      }
    }
  }, [result]);

  const isWelcome = step === "welcome";
  const isDocs = step === "docs";

  return (
    <ThemeProvider defaultTheme="system">
      <div className="flex h-screen flex-col bg-background">
      <Header
        onDocsClick={handleDocsClick}
        onUpdatesClick={handleUpdatesClick}
        checkingUpdate={checkingUpdate}
      />
      <div
        className={`mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-6 ${
          isDocs ? "min-h-0 overflow-hidden" : "items-center justify-center"
        }`}
      >
        {!isWelcome && !isDocs && (
          <StepIndicator currentStep={step} outputMode={outputMode} />
        )}
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={screenSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`w-full ${isDocs ? "mt-6 min-h-0 flex-1 overflow-hidden" : "mt-6"}`}
          >
          <ErrorBoundary>
          <Suspense fallback={null}>
          {step === "welcome" && <ModeSelector onSelect={handleModeSelect} />}
          {step === "docs" && <Documentation onBack={handleDocsClose} />}

          {/* SAF ZIP flow */}
          {step === "select" && (
            <FilePicker
              files={files}
              onFilesChange={setFiles}
              onContinue={handleSelectContinue}
              onBack={handleSelectBack}
              onToast={showToast}
            />
          )}
          {step === "metadata" && (
            <MetadataEditor
              files={files}
              onFilesChange={setFiles}
              onBack={handleMetadataBack}
              onContinue={handleMetadataContinue}
            />
          )}
          {step === "generate" && (
            <ProgressPanel onGenerate={handleGenerate} onBack={handleGenerateBack} />
          )}

          {/* CSV flow */}
          {step === "csv-metadata" && (
            <CsvMetadataEditor
              files={files}
              onFilesChange={setFiles}
              onBack={handleCsvBack}
              onContinue={handleCsvContinue}
            />
          )}
          {step === "csv-generate" && (
            <CsvProgressPanel onGenerate={handleCsvGenerate} onBack={handleCsvGenerateBack} />
          )}
          </Suspense>
          </ErrorBoundary>

          {step === "done" && result && (
            <motion.div {...scaleIn} className="mx-auto max-w-2xl">
              <Card className="border-border ring-0">
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
                    <CircleCheck className="size-7 text-emerald-600" aria-hidden="true" />
                  </div>
                  <h2 className="mb-1.5 text-xl font-semibold">
                    {outputMode === "metadata-csv" ? "Metadata CSV Created" : "SAF Package Created"}
                  </h2>
                  <p className="mb-6 text-sm text-muted-foreground tabular-nums">
                    {result.items_created} {outputMode === "metadata-csv" ? "items exported" : "items created"} successfully
                  </p>
                  <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/60 p-4 text-left">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {outputMode === "metadata-csv" ? "CSV file" : "Output location"}
                    </p>
                    <p className="font-mono text-sm break-all">{result.output_path}</p>
                    {result.zip_path && (
                      <>
                        <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">
                          ZIP archive
                        </p>
                        <p className="font-mono text-sm break-all">{result.zip_path}</p>
                      </>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <Alert variant="destructive" className="mb-6 text-left">
                      <TriangleAlert aria-hidden="true" />
                      <AlertTitle>Errors</AlertTitle>
                      <AlertDescription>
                        <ul className="space-y-1">
                          {result.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button onClick={handleOpenOutput}>
                        <ExternalLink aria-hidden="true" />
                        Open Output Folder
                      </Button>
                    </motion.div>
                    <Button
                      variant="outline"
                      onClick={handleStartOver}
                    >
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
      <AnimatePresence>
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {updateDialogOpen && pendingUpdate && (
          <UpdateDialog
            update={pendingUpdate}
            onClose={() => setUpdateDialogOpen(false)}
          />
        )}
      </AnimatePresence>
      </div>
    </ThemeProvider>
  );
}

export default App;
