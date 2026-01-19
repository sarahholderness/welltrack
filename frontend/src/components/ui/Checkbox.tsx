import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`inline-flex items-center ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={`
            h-4 w-4 rounded border-gray-300 text-primary-600
            focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500' : ''}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {label && (
          <label htmlFor={inputId} className="ml-2 text-sm text-gray-700 cursor-pointer">
            {label}
          </label>
        )}
        {error && (
          <p id={`${inputId}-error`} className="ml-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
