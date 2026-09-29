import { memo, useState, useMemo } from "react";
import { motion } from "motion/react";
import { BookOpenText, ChevronLeft, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fadeIn } from "@/lib/animations";
import { ALL_FIELDS } from "../data/dc-fields";
import type { DcField } from "../data/dc-fields";

interface DocumentationProps {
  onBack: () => void;
}

function groupByElement(fields: DcField[]): Map<string, DcField[]> {
  const groups = new Map<string, DcField[]>();
  for (const field of fields) {
    const key = field.element.charAt(0).toUpperCase() + field.element.slice(1);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(field);
  }
  return groups;
}

function Documentation({ onBack }: DocumentationProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DcField | null>(null);

  const filteredFields = useMemo(() => {
    if (!search.trim()) return ALL_FIELDS;
    const q = search.toLowerCase();
    return ALL_FIELDS.filter(
      (f) =>
        f.header.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.schema.toLowerCase().includes(q)
    );
  }, [search]);

  const groups = useMemo(() => groupByElement(filteredFields), [filteredFields]);

  return (
    <motion.div {...fadeIn} className="h-full min-h-0">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden border-border ring-0">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
            Back
          </Button>
          <h2 className="text-base font-semibold">Dublin Core Metadata Reference</h2>
          <div className="w-16" />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left panel — searchable field list */}
          <div className="flex min-h-0 w-[40%] flex-col border-r border-border">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  aria-label="Search metadata fields"
                  className="pr-8 pl-9"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                {filteredFields.length} of {ALL_FIELDS.length} fields
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredFields.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Search
                    className="mx-auto mb-2 size-8 text-muted-foreground/40"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">No fields match your search</p>
                </div>
              ) : (
                <div className="py-1">
                  {Array.from(groups.entries()).map(([element, fields]) => (
                    <div key={element}>
                      <div className="sticky top-0 z-[1] bg-muted px-4 py-1.5">
                        <h3 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {element}
                        </h3>
                      </div>
                      {fields.map((field) => (
                        <button
                          key={field.header}
                          onClick={() => setSelected(field)}
                          aria-current={selected?.header === field.header}
                          className={`w-full border-l-2 px-4 py-2 text-left transition-colors ${
                            selected?.header === field.header
                              ? "border-l-primary bg-primary/5"
                              : "border-l-transparent hover:bg-accent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <code className="truncate font-mono text-xs font-medium text-primary">
                              {field.header}
                            </code>
                            <span className="flex shrink-0 items-center gap-1">
                              <Badge
                                variant="outline"
                                className={`px-1 py-px text-[9px] ${
                                  field.schema === "dc"
                                    ? "border-primary/50 text-primary font-semibold"
                                    : field.schema === "dcterms"
                                      ? "border-blue-500/50 text-blue-600 dark:text-blue-400"
                                      : field.schema === "dspace"
                                        ? "border-purple-500/50 text-purple-600 dark:text-purple-400"
                                        : "border-amber-500/50 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {field.schema}
                              </Badge>
                              {field.legacy && (
                                <span className="rounded-4xl border border-amber-500/50 px-1 py-px text-[9px] font-medium text-amber-600 dark:text-amber-400">
                                  legacy
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {field.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel — field detail */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {selected ? (
              <motion.div key={selected.header} {...fadeIn} className="p-6">
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-2.5">
                    <code className="rounded-lg bg-primary/5 px-3 py-1.5 font-mono text-lg font-bold text-primary">
                      {selected.header}
                    </code>
                    <span className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={
                          selected.schema === "dc"
                            ? "border-primary/50 text-primary font-semibold"
                            : selected.schema === "dcterms"
                              ? "border-blue-500/50 text-blue-600 dark:text-blue-400"
                              : selected.schema === "dspace"
                                ? "border-purple-500/50 text-purple-600 dark:text-purple-400"
                                : "border-amber-500/50 text-amber-600 dark:text-amber-400"
                        }
                      >
                        {selected.schema}
                      </Badge>
                      {selected.legacy && (
                        <span className="rounded-4xl border border-amber-500/50 px-1.5 py-px text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          legacy
                        </span>
                      )}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">{selected.label}</h3>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/60 p-4">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Element
                      </p>
                      <p className="text-sm font-medium">{selected.element}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Qualifier
                      </p>
                      <p className="text-sm font-medium">{selected.qualifier}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Schema
                      </p>
                      <p className="text-sm font-medium">{selected.schema}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Description
                    </p>
                    <p className="text-sm leading-relaxed">{selected.description}</p>
                  </div>

                  {selected.example && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Example
                      </p>
                      <div className="rounded-lg border border-border bg-muted/60 px-4 py-3">
                        <code className="font-mono text-sm">{selected.example}</code>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <BookOpenText
                  className="mb-4 size-16 text-muted-foreground/30"
                  strokeWidth={0.75}
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Select a field from the list to view its details
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Click any metadata field on the left panel
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default memo(Documentation);
