import React, { useMemo, useState } from "react";
import { Check, ChevronDown } from "../icons";
import { Input } from "./input";
import { Popover, PopoverContent } from "./popover";
import { cn } from "../../utils/cn";

export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  disabled = false,
  maxLength,
  triggerClassName,
  contentClassName,
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const sanitizeSingleLine = (value = "") =>
    String(value)
      .replace(/[^A-Za-z0-9 _\-";:'\n\r]/g, "")
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trimStart();

  const blockShortcuts = (event) => {
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    if (!hasModifier) return;

    const key = String(event.key || "").toLowerCase();
    const allowClipboard = (event.ctrlKey || event.metaKey) && (key === "v" || key === "c" || key === "x");
    const allowShiftInsert = event.shiftKey && key === "insert";

    if (allowClipboard || allowShiftInsert) return;

    event.preventDefault();
  };

  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;
    return options.filter((option) => {
      const label = `${option.label ?? ""}`.toLowerCase();
      const val = `${option.value ?? ""}`.toLowerCase();
      return label.includes(normalizedSearch) || val.includes(normalizedSearch);
    });
  }, [options, normalizedSearch]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const handleOpenChange = (nextOpen) => {
    if (disabled) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchValue("");
    }
  };

  const handleSelect = (nextValue) => {
    if (disabled) return;
    onValueChange?.(nextValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (filteredOptions.length > 0) {
      handleSelect(filteredOptions[0].value);
    } else {
      setSearchValue("");
    }
  };

  const handleInputKeyDown = (event) => {
    blockShortcuts(event);
    if (event.defaultPrevented) return;
    handleSearchKeyDown(event);
  };

  const displayValue = open ? searchValue : (selectedOption?.label ?? "");
  const placeholderText = placeholder;

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <div className="relative w-full">
        <Input
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          value={displayValue}
          placeholder={placeholderText}
          onFocus={() => !disabled && setOpen(true)}
          onClick={() => !disabled && setOpen(true)}
          onChange={(event) => {
            if (!open) setOpen(true);
            let nextValue = sanitizeSingleLine(event.target.value);
            if (typeof maxLength === "number" && maxLength > 0) {
              nextValue = nextValue.slice(0, maxLength);
            }
            setSearchValue(nextValue);
          }}
          onKeyDown={handleInputKeyDown}
          maxLength={maxLength}
          className={cn(
            "w-full bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 pr-8",
            triggerClassName
          )}
        />
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
      </div>
      <PopoverContent
        className={cn("w-full p-0 bg-slate-800 border-gray-300 text-white", contentClassName)}
        align="start"
      >
        <div className="max-h-64 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">{emptyText}</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm text-white hover:bg-slate-700",
                    isSelected && "bg-slate-700",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check className="h-4 w-4 text-pink-400" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
