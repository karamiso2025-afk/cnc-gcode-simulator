'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, value = [0], onValueChange, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      value={value[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn(
        'w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary',
        className
      )}
      {...props}
    />
  )
);
Slider.displayName = 'Slider';

export { Slider };
