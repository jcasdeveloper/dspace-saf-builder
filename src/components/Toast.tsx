import { useEffect } from "react";
import { motion } from "motion/react";
import { CircleCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { slideUp, slideUpExit } from "@/lib/animations";

interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      {...slideUp}
      {...slideUpExit}
      className="fixed right-6 bottom-6 z-50 max-w-[400px]"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
        <CircleCheck className="size-5 shrink-0 text-emerald-500" aria-hidden="true" />
        <span className="grow text-sm font-medium">{message}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="-me-2 shrink-0"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </motion.div>
  );
}

export default Toast;
