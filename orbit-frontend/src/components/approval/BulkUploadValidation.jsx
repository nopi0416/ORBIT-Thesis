import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import approvalRequestService from '../../services/approvalRequestService';

// Debounce utility function
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Memoized table row component for performance
const BulkTableRow = React.memo(({ 
  item, 
  handleUpdate, 
  getStatusBadge 
}) => {
  const rowClass = item.status === 'invalid' 
    ? 'bg-red-900/20' 
    : item.status === 'warning' 
    ? 'bg-yellow-900/20' 
    : 'bg-slate-800';
  
  return (
    <tr className={`border-t border-slate-600 ${rowClass}`}>
      <td className="px-2 py-2 text-gray-300 border-r border-slate-600 text-center text-sm">{item.index + 1}</td>
      <td className="px-2 py-2 border-r border-slate-600">
        <Input
          value={item.employee_id}
          disabled
          className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed text-sm h-7"
          placeholder="Required"
        />
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.employee_name || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.position || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.department || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.employeeData?.employee_status || item.employeeData?.active_status || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.employeeData?.geo || item.employeeData?.region || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.employeeData?.location || item.employeeData?.site || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.employeeData?.hire_date || item.employeeData?.date_hired || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-slate-300 text-sm">
        {item.employeeData?.termination_date || item.employeeData?.end_date || item.employeeData?.exit_date || '—'}
      </td>
      <td className="px-2 py-2 border-r border-slate-600">
        <Input
          type="number"
          value={item.amount}
          onChange={(e) => handleUpdate(item.index, 'amount', Number(e.target.value))}
          className="bg-slate-700 border-gray-600 text-white text-sm h-7"
          placeholder="Required"
        />
      </td>
      <td className="px-2 py-2 border-r border-slate-600 text-center">
        <Checkbox
          checked={item.is_deduction}
          onCheckedChange={(checked) => handleUpdate(item.index, 'is_deduction', checked)}
          className="border-gray-600"
        />
      </td>
      <td className="px-2 py-2 border-r border-slate-600">
        <Textarea
          value={item.notes || ''}
          onChange={(e) => handleUpdate(item.index, 'notes', e.target.value)}
          className="bg-slate-700 border-gray-600 text-white text-sm min-h-[28px] resize-none"
          rows={1}
          placeholder="Optional"
        />
      </td>
      <td className="px-2 py-2">
        <div className="space-y-1">
          {getStatusBadge(item.status)}
          {item.validation.errors && item.validation.errors.length > 0 && (
            <div className="text-xs text-red-300">
              {item.validation.errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}
          {item.validation.warnings && item.validation.warnings.length > 0 && (
            <div className="text-xs text-yellow-300">
              {item.validation.warnings.map((warn, i) => (
                <div key={i}>• {warn}</div>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if item data changed
  return (
    prevProps.item.index === nextProps.item.index &&
    prevProps.item.employee_id === nextProps.item.employee_id &&
    prevProps.item.employee_name === nextProps.item.employee_name &&
    prevProps.item.amount === nextProps.item.amount &&
    prevProps.item.is_deduction === nextProps.item.is_deduction &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.status === nextProps.item.status &&
    JSON.stringify(prevProps.item.validation) === JSON.stringify(nextProps.item.validation)
  );
});

BulkTableRow.displayName = 'BulkTableRow';

const BulkUploadValidation = ({ 
  bulkItems, 
  setBulkItems, 
  selectedConfig, 
  organizations,
  validateEmployee 
}) => {
  const [activeTab, setActiveTab] = useState('valid');
  const [employeeLookupQueue, setEmployeeLookupQueue] = useState(new Map());
  const lookupTimeoutRef = useRef(null);
  const token = localStorage.getItem('authToken') || '';
  const companyId = 'caaa0000-0000-0000-0000-000000000001';

  const debouncedBulkItems = useDebounce(bulkItems, 3500);
  const validationSource = debouncedBulkItems.length ? debouncedBulkItems : bulkItems;
  
  // Debounced employee ID changes
  // Auto-lookup disabled per user request
  // const debouncedLookupQueue = useDebounce(employeeLookupQueue, 500);
  // useEffect(() => {
  //   // Real-time employee lookup removed
  // }, [debouncedLookupQueue, companyId, token, setBulkItems]);
  
  const validatedItems = useMemo(() => {
    // First, count occurrences of each employee_id
    const employeeIdCounts = {};
    validationSource.forEach((item) => {
      if (item.employee_id && item.employee_id.trim()) {
        const eid = item.employee_id.trim().toUpperCase();
        employeeIdCounts[eid] = (employeeIdCounts[eid] || 0) + 1;
      }
    });
    
    // Track which employee IDs we've already seen
    const seenEmployeeIds = new Set();
    
    return bulkItems.map((item, index) => {
      const sourceItem = validationSource[index] || item;
      const validation = validateEmployee ? validateEmployee(sourceItem) : { valid: true, warnings: [], errors: [] };
      
      // Check for duplicates FIRST - if duplicate, override "Employee not found" error
      let isDuplicate = false;
      if (sourceItem.employee_id && sourceItem.employee_id.trim()) {
        const eid = sourceItem.employee_id.trim().toUpperCase();
        if (employeeIdCounts[eid] > 1) {
          if (seenEmployeeIds.has(eid)) {
            // This is a duplicate occurrence
            isDuplicate = true;
            // Remove "Employee not found" error if present (duplicate means it was found)
            validation.errors = (validation.errors || []).filter(err => err !== 'Employee not found');
            // Add duplicate error only if not already present
            if (!validation.errors.includes('Duplicate Employee ID')) {
              validation.errors.push('Duplicate Employee ID');
            }
          } else {
            // First occurrence, just mark as seen
            seenEmployeeIds.add(eid);
          }
        }
      }
      
      const hasErrors = validation.errors && validation.errors.length > 0;
      const hasWarnings = validation.warnings && validation.warnings.length > 0;
      
      return {
        ...item,
        index,
        validation,
        isDuplicate,
        status: hasErrors ? 'invalid' : hasWarnings ? 'warning' : 'valid'
      };
    });
  }, [bulkItems, validateEmployee, validationSource]);
  
  const filteredItems = useMemo(() => {
    return validatedItems.filter(item => item.status === activeTab);
  }, [validatedItems, activeTab]);

  const MAX_VISIBLE_ROWS = 6;
  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, MAX_VISIBLE_ROWS);
  }, [filteredItems]);
  
  const counts = useMemo(() => {
    return {
      valid: validatedItems.filter(i => i.status === 'valid').length,
      warning: validatedItems.filter(i => i.status === 'warning').length,
      invalid: validatedItems.filter(i => i.status === 'invalid').length,
    };
  }, [validatedItems]);
  
  const handleUpdate = useCallback((index, field, value) => {
    setBulkItems(prevItems => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    
    // Queue employee lookup separately to avoid setState during render
    if (field === 'employee_id' && value && value.trim()) {
      // Use setTimeout to defer the state update
      setTimeout(() => {
        setEmployeeLookupQueue(prev => {
          const newQueue = new Map(prev);
          newQueue.set(value.trim(), index);
          return newQueue;
        });
      }, 0);
    }
  }, [setBulkItems]);
  
  const getStatusBadge = useCallback((status) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-600 text-white text-xs">Valid</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-600 text-white text-xs">Warning</Badge>;
      case 'invalid':
        return <Badge className="bg-red-600 text-white text-xs">Invalid</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white text-xs">Unknown</Badge>;
    }
  }, []);
  
  if (!bulkItems || bulkItems.length === 0) return null;
  
  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      <Label className="text-white">Validation & Preview</Label>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="bg-slate-700 border-slate-600 p-1 w-full justify-start">
          <TabsTrigger 
            value="valid" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300"
          >
            Valid ({counts.valid})
          </TabsTrigger>
          <TabsTrigger 
            value="warning" 
            className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white text-gray-300"
          >
            Warning ({counts.warning})
          </TabsTrigger>
          <TabsTrigger 
            value="invalid" 
            className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300"
          >
            Invalid ({counts.invalid})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="flex-1 min-h-0 mt-2 flex flex-col">
          <div className="border border-slate-600 rounded-md overflow-x-auto overflow-y-auto flex-1 max-h-[50vh]">
            <table className="w-full min-w-[1400px] border-collapse">
              <thead className="bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '40px' }}>#</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '100px' }}>Employee ID</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '140px' }}>Employee Name</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '100px' }}>Position</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '100px' }}>Department</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '80px' }}>Status</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '80px' }}>Geo</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '100px' }}>Location</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '90px' }}>Hire Date</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '90px' }}>Termination Date</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '100px' }}>Amount</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '70px' }}>Deduction</th>
                  <th className="px-2 py-2 text-left text-white font-semibold border-r border-slate-600 text-sm" style={{ minWidth: '150px' }}>Notes</th>
                  <th className="px-2 py-2 text-left text-white font-semibold text-sm" style={{ minWidth: '90px' }}>Validation</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <BulkTableRow 
                    key={`${item.index}-${item.employee_id}`}
                    item={item}
                    handleUpdate={handleUpdate}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Showing {Math.min(MAX_VISIBLE_ROWS, filteredItems.length)} of {filteredItems.length} rows.
          </div>
        </TabsContent>
      </Tabs>
      
      <p className="text-xs text-gray-400">
        <strong className="text-red-400">Invalid:</strong> Employee not in scope. 
        <strong className="text-yellow-400 ml-3">Warning:</strong> Deduction/amount needs notes. 
        <strong className="text-green-400 ml-3">Valid:</strong> Ready to submit.
      </p>
    </div>
  );
};

export default BulkUploadValidation;
