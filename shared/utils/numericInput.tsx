import React, { useState, useEffect } from 'react';
import { isValidHalfStepInput, isValidHalfStepValue } from './halfStepQuantity';

/**
 * Numeric input component that only allows numbers.
 * Replaces type="number" inputs to avoid default 0 value issue.
 */
interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number | undefined;
  onChange: (value: number) => void;
  /** When true, only whole numbers and .5 increments are allowed (pair-based qty). */
  allowDecimals?: boolean;
  allowNegative?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  allowDecimals = false,
  allowNegative = false,
  className = '',
  ...props
}) => {
  // When typing decimals, keep incomplete input (e.g. "1." or ".") so the dot doesn't disappear
  const [incomplete, setIncomplete] = useState<string | null>(null);

  // Sync from parent when value changes externally (e.g. reset)
  useEffect(() => {
    if (incomplete !== null && value !== undefined) {
      const fromParent = value === 0 ? '' : value.toString();
      if (fromParent !== incomplete) setIncomplete(null);
    }
  }, [value]);

  const isAllowedInput = (inputValue: string): boolean => {
    if (allowDecimals) {
      return isValidHalfStepInput(inputValue);
    }

    let pattern = '^[0-9]+';
    if (allowNegative) {
      pattern = '^-?' + pattern.substring(1);
    }
    return new RegExp(pattern).test(inputValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      setIncomplete(null);
      onChange(0);
      return;
    }

    if (!isAllowedInput(inputValue)) return;

    if (allowDecimals && (inputValue.endsWith('.') || inputValue === '.')) {
      setIncomplete(inputValue);
      const n = parseFloat(inputValue);
      onChange(isNaN(n) ? 0 : n);
      return;
    }

    setIncomplete(null);
    const numericValue = parseFloat(inputValue);
    if (!isNaN(numericValue)) {
      if (allowDecimals && !isValidHalfStepValue(numericValue)) return;
      onChange(numericValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (incomplete !== null) {
      const n = parseFloat(incomplete);
      if (!isNaN(n) && (!allowDecimals || isValidHalfStepValue(n))) {
        onChange(n);
      }
      setIncomplete(null);
    }
    props.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;

    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if ([8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }

    const isDigit =
      (!e.shiftKey && e.keyCode >= 48 && e.keyCode <= 57) ||
      (e.keyCode >= 96 && e.keyCode <= 105);

    if (allowDecimals && target.value.includes('.')) {
      const afterDot = target.value.split('.')[1] ?? '';
      if (isDigit) {
        // Only "5" allowed as the single digit after the decimal point
        if (afterDot.length === 0 && e.key === '5') return;
        e.preventDefault();
        return;
      }
    }

    if (isDigit) return;

    // Allow decimal point if decimals are allowed (190 = period, 110 = numpad decimal)
    if (allowDecimals && (e.keyCode === 190 || e.keyCode === 110) && !target.value.includes('.')) {
      return;
    }
    // Allow negative sign if negative numbers are allowed
    if (allowNegative && e.keyCode === 189 && !target.value.includes('-')) {
      return;
    }
    e.preventDefault();
  };

  const displayValue = incomplete !== null
    ? incomplete
    : (value === undefined || value === 0 ? '' : value.toString());

  return (
    <input
      {...props}
      type="text"
      className={`form-control ${className}`}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      pattern="[0-9]*"
    />
  );
};

export default NumericInput;
