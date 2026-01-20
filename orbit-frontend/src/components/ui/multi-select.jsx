import React, { useState } from 'react';
import { ChevronDown } from '../icons';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Checkbox } from './checkbox';
import { Label } from './label';

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  hasAllOption = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value) => {
    if (disabled) return;
    if (value === "all") {
      if (selected.length === options.length) {
        onChange([]);
      } else {
        onChange(options.map((opt) => opt.value));
      }
    } else {
      if (selected.includes(value)) {
        onChange(selected.filter((item) => item !== value));
      } else {
        onChange([...selected, value]);
      }
    }
  };

  const allSelected = hasAllOption && selected.length === options.length;

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal bg-slate-700 border-gray-300 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === options.length && hasAllOption
                ? "All"
                : `${selected.length} selected`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-800 border-gray-300 text-white" align="start">
        <div className="max-h-64 overflow-auto">
          {hasAllOption && (
            <div className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-700">
              <Checkbox 
                id="option-all" 
                checked={allSelected} 
                disabled={disabled}
                onCheckedChange={() => handleToggle("all")} 
              />
              <Label htmlFor="option-all" className="flex-1 cursor-pointer text-sm font-medium text-white">
                All
              </Label>
            </div>
          )}
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-700">
              <Checkbox
                id={`option-${option.value}`}
                checked={selected.includes(option.value)}
                disabled={disabled}
                onCheckedChange={() => handleToggle(option.value)}
              />
              <Label htmlFor={`option-${option.value}`} className="flex-1 cursor-pointer text-sm text-white">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}