import { memo } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "cn";
import { stepPop } from "@/lib/animations";
import type { AppStep, OutputMode } from "../types";

const SAF_STEPS: { key: AppStep; label: string; num: number }[] = [
  { key: "select", label: "Select Files", num: 1 },
  { key: "metadata", label: "Metadata", num: 2 },
  { key: "generate", label: "Generate", num: 3 },
];

const CSV_STEPS: { key: AppStep; label: string; num: number }[] = [
  { key: "csv-metadata", label: "Metadata", num: 1 },
  { key: "csv-generate", label: "Generate", num: 2 },
];

const SAF_STEP_ORDER: AppStep[] = ["select", "metadata", "generate", "done", "docs"];
const CSV_STEP_ORDER: AppStep[] = ["csv-metadata", "csv-generate", "done", "docs"];

interface StepIndicatorProps {
  currentStep: AppStep;
  outputMode: OutputMode | null;
}

function StepIndicator({ currentStep, outputMode }: StepIndicatorProps) {
  const steps = outputMode === "metadata-csv" ? CSV_STEPS : SAF_STEPS;
  const stepOrder = outputMode === "metadata-csv" ? CSV_STEP_ORDER : SAF_STEP_ORDER;
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const sIdx = stepOrder.indexOf(s.key);
        const isCompleted = currentIdx > sIdx;
        const isActive = currentStep === s.key || (currentStep === "done" && s.key === steps[steps.length - 1].key);

        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                custom={i}
                variants={stepPop}
                initial="hidden"
                animate="visible"
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                  isCompleted || isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  s.num
                )}
              </motion.div>
              <span
                className={cn(
                  "mt-1.5 text-xs font-medium",
                  isActive || isCompleted ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 mt-[-18px] h-0.5 w-16 rounded",
                  currentIdx > sIdx ? "bg-primary" : "bg-primary/25"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(StepIndicator);
