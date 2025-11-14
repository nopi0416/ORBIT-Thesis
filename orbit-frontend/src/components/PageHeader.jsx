import React from 'react';
import { cn } from '../utils/cn';

const PageHeader = ({ 
  title, 
  description, 
  children, 
  className,
  ...props 
}) => {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-pink-500 to-purple-600 text-white",
        className
      )}
      {...props}
    >
      <div className="px-6 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && (
              <p className="text-white/80 text-sm">{description}</p>
            )}
          </div>
          {children && (
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { PageHeader };