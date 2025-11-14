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
}) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value) => {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-transparent"
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
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-64 overflow-auto p-2">
          {hasAllOption && (
            <div className="flex items-center space-x-2 rounded-sm px-2 py-2 hover:bg-accent">
              <Checkbox 
                id="option-all" 
                checked={allSelected} 
                onCheckedChange={() => handleToggle("all")} 
              />
              <Label htmlFor="option-all" className="flex-1 cursor-pointer text-sm font-medium">
                All
              </Label>
            </div>
          )}
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2 rounded-sm px-2 py-2 hover:bg-accent">
              <Checkbox
                id={`option-${option.value}`}
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              <Label htmlFor={`option-${option.value}`} className="flex-1 cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}