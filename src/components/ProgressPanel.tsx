import { memo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, ChevronLeft, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fadeIn } from "@/lib/animations";

interface ProgressPanelProps {
  onGenerate: (outputDir: string) => Promise<void>;
  onBack: () => void;
}

function ProgressPanel({ onGenerate, onBack }: ProgressPanelProps) {
  const [outputDir, setOutputDir] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSelectOutput = useCallback(async () => {
    const folder = await open({ directory: true });
    if (folder && typeof folder === "string") {
      setOutputDir(folder);
      setError(null);
    }
  }, []);

  const handleGenerate = useCallback(
    async (dir: string) => {
      setIsGenerating(true);
      setProgress(0);
      setError(null);

      // Animate progress to 90% while awaiting backend
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 40);

      try {
        await onGenerate(dir);
        setProgress(100);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          "Generation failed. Please check the output folder permissions and try again. " +
            (msg.split(":").pop()?.trim() ?? "")
        );
      } finally {
        clearInterval(interval);
        setIsGenerating(false);
      }
    },
    [onGenerate]
  );

  return (
    <motion.div {...fadeIn}>
      <Card className="border-border ring-0">
        <CardContent>
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to metadata">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="w-9" />
          </div>

          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium" htmlFor="output-folder">
              Output folder
            </label>
            <button
              onClick={handleSelectOutput}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <FolderOpen className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate font-mono text-sm text-muted-foreground">
                {outputDir || "Click to select output folder..."}
              </span>
            </button>
            <Input id="output-folder" type="hidden" value={outputDir} readOnly className="hidden" />
            {!outputDir && (
              <p className="text-xs">
                <span className="font-bold text-primary">Required</span>{" "}
                <span className="text-muted-foreground">— select where to save the ZIP file</span>
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isGenerating && (
            <div className="mb-6">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">Generating...</span>
                <span className="text-sm font-medium text-emerald-600 tabular-nums">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <motion.div whileTap={outputDir && !isGenerating ? { scale: 0.98 } : undefined}>
            <Button
              onClick={() => handleGenerate(outputDir)}
              disabled={isGenerating || !outputDir}
              size="lg"
              className="w-full text-base"
            >
              <Download aria-hidden="true" />
              {isGenerating ? "Generating..." : "Create ZIP Package"}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default memo(ProgressPanel);
