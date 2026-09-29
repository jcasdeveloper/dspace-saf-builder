import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpenText, Moon, RefreshCw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

interface HeaderProps {
  onDocsClick: () => void;
  onUpdatesClick: () => void;
  checkingUpdate: boolean;
}

function Header({ onDocsClick, onUpdatesClick, checkingUpdate }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <motion.header
      initial={false}
      animate={{ backgroundColor: isDark ? "#a5da5e" : "#92c648" }}
      transition={{ duration: 0.3 }}
      className="px-6 py-3"
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <img src="/siteicon.svg" alt="SAFBuilder logo" className="w-16 h-16" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={cycleTheme}
            aria-label={`Switch theme (current: ${theme})`}
            title={`Theme: ${theme} — click to switch`}
            className="shrink-0 text-white/85 hover:text-white hover:bg-white/15"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? "sun" : "moon"}
                initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                {isDark ? (
                  <Sun className="size-4" aria-hidden="true" />
                ) : (
                  <Moon className="size-4" aria-hidden="true" />
                )}
              </motion.span>
            </AnimatePresence>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onUpdatesClick}
            disabled={checkingUpdate}
            aria-label={
              checkingUpdate ? "Checking for updates" : "Check for updates"
            }
            title={
              checkingUpdate ? "Checking for updates…" : "Check for updates"
            }
            className="shrink-0 text-white/85 hover:text-white hover:bg-white/15"
          >
            <RefreshCw
              className={`size-4 ${checkingUpdate ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDocsClick}
            aria-label="Dublin Core Docs"
            title="Dublin Core Docs"
            className="shrink-0 text-white/85 hover:text-white hover:bg-white/15"
          >
            <BookOpenText className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

export default memo(Header);
