import { memo, useCallback } from "react";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeIn } from "@/lib/animations";
import DatePicker from "./DatePicker";
import { DC_TYPE_VALUES } from "@/data/dc-type-values";
import { ENTITY_TYPE_VALUES } from "@/data/entity-type-values";
import type { MetadataEntry } from "../types";

interface FieldRowProps {
  header: string;
  values: MetadataEntry[];
  onFieldChange: (header: string, values: MetadataEntry[]) => void;
}

function FieldRow({ header, values, onFieldChange }: FieldRowProps) {
  const isDateField = header.includes(".date") || header.endsWith(".date") || header === "date";
  const isTypeField = header === "dc.type";
  const isEntityTypeField = header === "dspace.entity.type";

  const handleValueChange = useCallback(
    (index: number, newValue: string) => {
      const updated = values.map((v, i) => (i === index ? { value: newValue } : v));
      onFieldChange(header, updated);
    },
    [header, values, onFieldChange]
  );

  const handleAddValue = useCallback(() => {
    onFieldChange(header, [...values, { value: "" }]);
  }, [header, values, onFieldChange]);

  const handleRemoveValue = useCallback(
    (index: number) => {
      if (values.length <= 1) return;
      onFieldChange(header, values.filter((_, i) => i !== index));
    },
    [header, values, onFieldChange]
  );

  const handleRemoveField = useCallback(() => {
    onFieldChange(header, []);
  }, [header, onFieldChange]);

  const selectValues = isTypeField ? DC_TYPE_VALUES : isEntityTypeField ? ENTITY_TYPE_VALUES : [];
  const selectPlaceholder = isTypeField ? "Select type..." : "Select entity type...";

  return (
    <motion.div {...fadeIn} className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-primary">{header}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleRemoveField}
          aria-label={`Remove field ${header}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-2">
        {values.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            {isTypeField || isEntityTypeField ? (
              <Select
                value={entry.value}
                onValueChange={(val) => { if (val) handleValueChange(index, val); }}
              >
                <SelectTrigger className="w-full" aria-label={`${header} value ${index + 1}`}>
                  <SelectValue placeholder={selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {selectValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : isDateField ? (
              <DatePicker
                value={entry.value}
                onChange={(date) => handleValueChange(index, date)}
                ariaLabel={`${header} value ${index + 1}`}
              />
            ) : (
              <Input
                type="text"
                value={entry.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                placeholder="Enter value..."
                aria-label={`${header} value ${index + 1}`}
              />
            )}
            {values.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemoveValue(index)}
                aria-label="Remove value"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={handleAddValue} className="mt-2 h-auto p-0 text-xs font-semibold text-primary hover:text-primary">
        <Plus aria-hidden="true" />
        Add value
      </Button>
    </motion.div>
  );
}

export default memo(FieldRow);
