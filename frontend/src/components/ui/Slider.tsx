import { forwardRef } from 'react';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  value: number;
  min?: number;
  max?: number;
  error?: string;
  showValue?: boolean;
  valueLabel?: (value: number) => string;
  colorScale?: boolean;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      label,
      value,
      min = 1,
      max = 10,
      error,
      id,
      showValue = true,
      valueLabel,
      colorScale = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const sliderId = id || label.toLowerCase().replace(/\s+/g, '-');

    const getTextColorClass = (val: number) => {
      if (!colorScale) return 'text-primary-600';
      const percentage = ((val - min) / (max - min)) * 100;
      if (percentage <= 30) return 'text-green-600';
      if (percentage <= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={sliderId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {showValue && (
            <span className={`text-lg font-semibold ${getTextColorClass(value)}`}>
              {valueLabel ? valueLabel(value) : `${value}/${max}`}
            </span>
          )}
        </div>

        <div className="relative">
          <input
            ref={ref}
            type="range"
            id={sliderId}
            min={min}
            max={max}
            value={value}
            className={`
              w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-gray-300
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-gray-300
              [&::-moz-range-thumb]:shadow-md
              [&::-moz-range-thumb]:cursor-pointer
              ${className}
            `}
            style={{
              background: `linear-gradient(to right, ${
                colorScale
                  ? percentage <= 30
                    ? '#22c55e'
                    : percentage <= 60
                      ? '#eab308'
                      : '#ef4444'
                  : '#0d9488'
              } 0%, ${
                colorScale
                  ? percentage <= 30
                    ? '#22c55e'
                    : percentage <= 60
                      ? '#eab308'
                      : '#ef4444'
                  : '#0d9488'
              } ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
            }}
            {...props}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{min}</span>
          <span>{max}</span>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';
