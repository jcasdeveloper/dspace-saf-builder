import { memo } from "react";
import { motion } from "motion/react";
import { FileSpreadsheet, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fadeIn } from "@/lib/animations";
import type { OutputMode } from "../types";

interface ModeSelectorProps {
  onSelect: (mode: OutputMode) => void;
}

function ModeSelector({ onSelect }: ModeSelectorProps) {
  return (
    <motion.div {...fadeIn} className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold">What would you like to create?</h1>
        <p className="text-sm text-muted-foreground">
          Choose an output format to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <button
            onClick={() => onSelect("saf-zip")}
            className="flex h-full w-full cursor-pointer items-start rounded-xl border border-border bg-card p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Card className="w-full border-0 bg-transparent p-0 shadow-none ring-0">
              <CardContent className="flex flex-col items-center gap-3 p-0 text-center">
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
                  <Package className="size-7 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold">SAF ZIP Package</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Bundle files with Dublin Core metadata for DSpace import.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Includes files, dublin_core.xml, contents, ZIP
                </p>
              </CardContent>
            </Card>
          </button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <button
            onClick={() => onSelect("metadata-csv")}
            className="flex h-full w-full cursor-pointer items-start rounded-xl border border-border bg-card p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Card className="w-full border-0 bg-transparent p-0 shadow-none ring-0">
              <CardContent className="flex flex-col items-center gap-3 p-0 text-center">
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
                  <FileSpreadsheet className="size-7 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold">Metadata CSV</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Create a CSV file for DSpace batch metadata import. No files needed.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Includes metadata columns (dc.title, dc.author, etc.)
                </p>
              </CardContent>
            </Card>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default memo(ModeSelector);
