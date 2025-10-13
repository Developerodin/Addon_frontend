import React from 'react';

/**
 * Numeric input component that only allows numbers
 * Replaces type="number" inputs to avoid default 0 value issue
 */
interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      onChange(0);
      return;
    }
    
    // Create regex pattern based on allowed characters
    let pattern = '^[0-9]+';
    if (allowDecimals) {
      pattern = '^[0-9]*\\.?[0-9]*';
    }
    if (allowNegative) {
      pattern = '^-?' + pattern.substring(1);
    }
    
    const regex = new RegExp(pattern);
    
    if (regex.test(inputValue)) {
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue)) {
        onChange(numericValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if ([8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      // Allow decimal point if decimals are allowed
      if (allowDecimals && e.keyCode === 190 && !e.target.value.includes('.')) {
        return;
      }
      // Allow negative sign if negative numbers are allowed
      if (allowNegative && e.keyCode === 189 && !e.target.value.includes('-')) {
        return;
      }
      e.preventDefault();
    }
  };

  return (
    <input
      {...props}
      type="text"
      className={`form-control ${className}`}
      value={value === 0 ? '' : value.toString()}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      inputMode="numeric"
      pattern="[0-9]*"
    />
  );
};

export default NumericInput;
