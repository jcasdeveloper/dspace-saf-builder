import { memo } from "react";
import { version } from "../../package.json";

const CURRENT_YEAR = new Date().getFullYear();

function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>
          © {CURRENT_YEAR} SAF Builder
          <span className="text-primary font-medium ml-1.5">— Developed by Joyjit Chowdhury</span>
        </span>
        <span>v{version}</span>
      </div>
    </footer>
  );
}

export default memo(Footer);
