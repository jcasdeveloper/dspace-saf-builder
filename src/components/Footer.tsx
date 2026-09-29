import { memo } from "react";
import { Loader2 } from "lucide-react";
import { version } from "../../package.json";

const CURRENT_YEAR = new Date().getFullYear();

interface FooterProps {
  checkingUpdate: boolean;
  updateVersion: string | null;
  onVersionClick: () => void;
}

function Footer({ checkingUpdate, updateVersion, onVersionClick }: FooterProps) {
  const updateAvailable = updateVersion !== null;

  const label = checkingUpdate
    ? "Checking for updates…"
    : updateAvailable
      ? `Update available (v${updateVersion}) — click to view`
      : "Check for updates";

  return (
    <footer className="border-t border-border bg-card px-6 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>
          © {CURRENT_YEAR} SAF Builder
          <span className="text-primary font-medium ml-1.5">— Developed by Joyjit Chowdhury</span>
        </span>
        <button
          type="button"
          onClick={onVersionClick}
          disabled={checkingUpdate}
          aria-label={label}
          title={label}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-70"
        >
          {checkingUpdate ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : updateAvailable ? (
            <span className="relative inline-flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : null}
          <span className="font-medium tabular-nums">v{version}</span>
        </button>
      </div>
    </footer>
  );
}

export default memo(Footer);
