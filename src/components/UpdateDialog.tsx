import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { CircleAlert, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fadeIn } from "@/lib/animations";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";

interface UpdateDialogProps {
  update: Update;
  onClose: () => void;
}

type Phase = "ready" | "downloading" | "installing" | "done" | "error";

function UpdateDialog({ update, onClose }: UpdateDialogProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [restartRequested, setRestartRequested] = useState(false);

  const canDismiss = phase === "ready" || phase === "error" || phase === "done";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canDismiss) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canDismiss, onClose]);

  const handleInstall = useCallback(async () => {
    setPhase("downloading");
    setPercent(0);
    setError(null);
    try {
      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            setPhase("downloading");
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setPercent(
                Math.min(99, Math.round((downloaded / contentLength) * 100))
              );
            }
            break;
          case "Finished":
            setPercent(100);
            setPhase("installing");
            break;
        }
      });
      setPhase("done");
    } catch (err) {
      console.error("Update failed:", err);
      setPhase("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [update]);

  const handleRestart = useCallback(async () => {
    setRestartRequested(true);
    try {
      await relaunch();
    } catch (err) {
      console.error("Relaunch failed:", err);
      setRestartRequested(false);
    }
  }, []);

  return (
    <motion.div
      {...fadeIn}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && canDismiss) onClose();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
        className="w-full max-w-md gap-4 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="update-dialog-title" className="text-lg font-semibold">
              {phase === "error"
                ? "Update failed"
                : phase === "done"
                  ? "Update installed"
                  : "Update available"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              v{update.currentVersion} → v{update.version}
            </p>
          </div>
          {canDismiss && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
              className="-me-2 -mt-1 shrink-0"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {update.body && phase !== "error" && (
          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {update.body}
          </div>
        )}

        {phase === "error" && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              {error || "The update could not be downloaded or installed."}
            </AlertDescription>
          </Alert>
        )}

        {(phase === "downloading" || phase === "installing") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                {phase === "installing" ? "Installing…" : "Downloading…"}
              </span>
              <span className="font-medium tabular-nums">
                {phase === "installing" ? 100 : percent}%
              </span>
            </div>
            <Progress value={phase === "installing" ? 100 : percent} />
            {phase === "installing" && (
              <p className="text-xs text-muted-foreground">
                The installer will finish and the app will restart.
              </p>
            )}
          </div>
        )}

        {phase === "done" && (
          <p className="text-sm text-muted-foreground">
            The update has been installed. Restart the app to finish.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {phase === "ready" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Later
              </Button>
              <Button onClick={handleInstall}>
                <RefreshCw aria-hidden="true" />
                Download &amp; Install
              </Button>
            </>
          )}
          {phase === "error" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Later
              </Button>
              <Button onClick={handleInstall}>Try Again</Button>
            </>
          )}
          {phase === "downloading" || phase === "installing" ? (
            <Button variant="outline" disabled>
              Please wait
            </Button>
          ) : null}
          {phase === "done" && (
            <Button onClick={handleRestart} disabled={restartRequested}>
              {restartRequested ? "Restarting…" : "Restart Now"}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default UpdateDialog;
