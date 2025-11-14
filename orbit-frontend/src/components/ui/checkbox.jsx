import React from 'react';
import { cn } from '../../utils/cn';
import { CheckIcon } from '../icons';

const Checkbox = React.forwardRef(({ 
  className, 
  checked, 
  onCheckedChange,
  disabled,
  id,
  ...props 
}, ref) => {
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        ref={ref}
        id={id}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      <div
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-colors",
          checked ? "bg-primary text-primary-foreground" : "bg-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
      >
        {checked && (
          <div className="flex items-center justify-center text-current">
            <CheckIcon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };