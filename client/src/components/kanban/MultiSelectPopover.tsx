import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiOption = { value: string; label: string; color?: string };

export function MultiSelectPopover({
  options,
  selected,
  onChange,
  placeholder,
  triggerLabel,
}: {
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? placeholder
        : `${triggerLabel ?? placeholder} (${selected.length})`;

  const toggle = (value: string, checked: boolean) => {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {labelText}
          </span>
          <div className="ml-2 flex items-center gap-1">
            {selected.length > 0 && (
              <button
                type="button"
                aria-label="Limpar"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="max-h-[280px] overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nada disponivel</p>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => toggle(opt.value, !!c)}
                  />
                  {opt.color && (
                    <span
                      className="size-3 shrink-0 rounded"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {checked && <Check className="h-3 w-3 text-primary" />}
                </label>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => onChange([])}
            >
              Limpar selecao
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
