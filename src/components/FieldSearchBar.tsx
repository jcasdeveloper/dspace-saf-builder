import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { scaleIn } from "@/lib/animations";
import { ALL_FIELDS } from "../data/dc-fields";

interface FieldSearchBarProps {
  usedHeaders: string[];
  onAddField: (header: string) => void;
}

const PRIORITY_HEADERS = ["dc.title", "dc.contributor.author", "dc.date.issued"];

function FieldSearchBar({ usedHeaders, onAddField }: FieldSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const usedSet = useMemo(() => new Set(usedHeaders), [usedHeaders]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const results = ALL_FIELDS.filter(
      (f) =>
        !usedSet.has(f.header) &&
        (query.trim() === "" ||
          f.header.toLowerCase().includes(q) ||
          f.label.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q))
    );

    return results.sort((a, b) => {
      const aPriority = PRIORITY_HEADERS.indexOf(a.header);
      const bPriority = PRIORITY_HEADERS.indexOf(b.header);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [query, usedSet]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && filtered[selectedIndex]) {
        onAddField(filtered[selectedIndex].header);
        setQuery("");
        setIsOpen(false);
      } else if (query.includes(".") && !usedSet.has(query)) {
        onAddField(query);
        setQuery("");
        setIsOpen(false);
      }
      return;
    }
  };

  const handleSelect = (header: string) => {
    onAddField(header);
    setQuery("");
    inputRef.current?.blur();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="field-search-listbox"
          aria-activedescendant={
            isOpen && filtered[selectedIndex]
              ? `field-option-${filtered[selectedIndex].header}`
              : undefined
          }
          placeholder="Search or type field name..."
          className="pl-9"
        />
      </div>

      <AnimatePresence>
        {isOpen && filtered.length > 0 && (
          <motion.div
            {...scaleIn}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            ref={listRef}
            id="field-search-listbox"
            role="listbox"
            className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-popover"
          >
            <div className="sticky top-0 z-[1] border-b border-border bg-popover px-4 py-1.5">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {filtered.length} field{filtered.length !== 1 ? "s" : ""} available
              </span>
            </div>
            {filtered.map((field, index) => (
              <div
                key={field.header}
                id={`field-option-${field.header}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(field.header)}
                className={cn(
                  "cursor-pointer border-l-2 px-4 py-2.5 transition-colors",
                  index === selectedIndex
                    ? "border-l-primary bg-primary/5"
                    : "border-l-transparent hover:bg-accent"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{field.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        field.schema === "dc"
                          ? "bg-primary/10 text-primary font-bold"
                          : field.schema === "dcterms"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : field.schema === "dspace"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {field.schema}
                    </span>
                    {field.legacy && (
                      <span className="rounded-4xl border border-amber-500/50 px-1 py-px text-[9px] font-medium text-amber-600 dark:text-amber-400">
                        legacy
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  {field.header}
                </p>
              </div>
            ))}
            <div className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-popover to-transparent" />
          </motion.div>
        )}

        {isOpen && query.trim() && filtered.length === 0 && (
          <motion.div
            {...scaleIn}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-popover p-4"
          >
            <p className="text-sm text-muted-foreground">No matching fields found.</p>
            {query.includes(".") && !usedSet.has(query) && (
              <button
                onClick={() => handleSelect(query)}
                className="mt-2 text-sm font-semibold text-primary hover:underline"
              >
                Add &ldquo;{query}&rdquo; as custom field
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FieldSearchBar;
