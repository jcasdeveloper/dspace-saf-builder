import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "cn";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  className?: string;
}

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-xs",
          "whitespace-nowrap transition-colors outline-none select-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-ring ring-3 ring-ring/50"
        )}
      >
        <span className={cn("truncate flex-1 text-left", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? (() => {
            const lastParen = selectedOption.label.lastIndexOf("(");
            const main = lastParen > 0 ? selectedOption.label.slice(0, lastParen).trim() : selectedOption.label;
            const sub = lastParen > 0 ? selectedOption.label.slice(lastParen) : "";
            return (
              <>
                <span>{main}</span>
                {sub && <span className="font-semibold text-primary ml-1 text-[10px]">{sub}</span>}
              </>
            );
          })() : placeholder}
        </span>
        <ChevronDown className={cn("size-3 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-[280px] rounded-lg border border-border bg-popover shadow-md">
          {/* Search Input */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields..."
                className="h-7 w-full rounded-md border border-input bg-transparent pl-7 pr-2 text-xs outline-none focus:border-ring"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                No fields found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const lastParen = option.label.lastIndexOf("(");
                const main = lastParen > 0 ? option.label.slice(0, lastParen).trim() : option.label;
                const sub = lastParen > 0 ? option.label.slice(lastParen) : "";
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      "outline-none",
                      option.value === value && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Check
                      className={cn(
                        "size-3 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 break-words">
                      <span>{main}</span>
                      {sub && <span className="font-semibold text-primary ml-1 text-[10px]">{sub}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { SearchableSelect };
export type { SearchableSelectOption };
