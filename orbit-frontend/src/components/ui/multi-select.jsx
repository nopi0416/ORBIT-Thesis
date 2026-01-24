import React, { useMemo, useState } from 'react';
import { ChevronDown } from '../icons';
import { Popover, PopoverContent } from './popover';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Input } from './input';

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  hasAllOption = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

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

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;
    return options.filter((option) => {
      const label = `${option.label ?? ''}`.toLowerCase();
      const value = `${option.value ?? ''}`.toLowerCase();
      return label.includes(normalizedSearch) || value.includes(normalizedSearch);
    });
  }, [options, normalizedSearch]);

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (filteredOptions.length > 0) {
      handleToggle(filteredOptions[0].value);
      setSearchValue('');
    } else {
      setSearchValue('');
    }
  };

  const handleOpenChange = (nextOpen) => {
    if (disabled) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchValue('');
    }
  };

  const summaryText =
    selected.length === 0
      ? ''
      : selected.length === options.length && hasAllOption
        ? 'All'
        : `${selected.length} selected`;

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <div className="relative w-full">
        <Input
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          value={open ? searchValue : summaryText}
          placeholder={placeholder}
          onFocus={() => !disabled && setOpen(true)}
          onClick={() => !disabled && setOpen(true)}
          onChange={(event) => {
            if (!open) setOpen(true);
            setSearchValue(event.target.value);
          }}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 pr-8"
        />
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
      </div>
      <PopoverContent className="w-full p-0 bg-slate-800 border-gray-300 text-white" align="start">
        <div className="max-h-64 overflow-auto">
          {hasAllOption && !normalizedSearch && (
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
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No results.</div>
          ) : (
            filteredOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-700">
                <Checkbox
                  id={`option-${option.value}`}
                  checked={selected.includes(option.value)}
                  disabled={disabled || option.disabled}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <Label htmlFor={`option-${option.value}`} className="flex-1 cursor-pointer text-sm text-white">
                  {option.label}
                </Label>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}