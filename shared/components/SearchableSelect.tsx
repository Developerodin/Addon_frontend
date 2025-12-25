"use client";
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, KeyboardEvent } from "react";

export interface SearchableSelectOption {
  id: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  getOptionLabel?: (option: SearchableSelectOption) => string;
  getOptionValue?: (option: SearchableSelectOption) => string;
  className?: string;
  emptyMessage?: string;
  noOptionsMessage?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  required = false,
  getOptionLabel = (option) => option.name,
  getOptionValue = (option) => option.id,
  className = "",
  emptyMessage = "No options available",
  noOptionsMessage = "No matches found",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const openingClickTargetRef = useRef<EventTarget | null>(null);
  const isOpeningRef = useRef(false);
  const openedAtRef = useRef<number>(0);

  // Get the selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => getOptionValue(opt) === value) || null;
  }, [options, value, getOptionValue]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }

    const query = searchQuery.toLowerCase().trim();
    return options.filter((option) => {
      const label = getOptionLabel(option).toLowerCase();
      return label.includes(query);
    });
  }, [options, searchQuery, getOptionLabel]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions.length, highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) {
      // Clear the opening click target when closed
      openingClickTargetRef.current = null;
      isOpeningRef.current = false;
      openedAtRef.current = 0;
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Ignore clicks within 200ms of opening (prevents the opening click from closing)
      const timeSinceOpen = Date.now() - openedAtRef.current;
      if (timeSinceOpen < 200) {
        return;
      }

      // Ignore clicks if we're in the process of opening
      if (isOpeningRef.current) {
        return;
      }

      // Ignore the click that opened the dropdown
      if (event.target === openingClickTargetRef.current) {
        openingClickTargetRef.current = null;
        return;
      }
      
      // Clear the opening target after first check
      if (openingClickTargetRef.current) {
        openingClickTargetRef.current = null;
      }
      
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    };

    // Use requestAnimationFrame twice to ensure we're in a completely different frame
    // This ensures the opening click event has fully completed before we attach the listener
    let rafId1: number;
    let rafId2: number;
    
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        // Reset opening flag after listener is attached
        isOpeningRef.current = false;
        document.addEventListener("mousedown", handleClickOutside, true);
      });
    });

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex]);

  const handleToggle = (e?: React.MouseEvent) => {
    if (disabled) return;
    e?.stopPropagation();
    e?.preventDefault();
    
    const willOpen = !isOpen;
    if (willOpen) {
      // Set opening flag immediately (synchronously) before state update
      isOpeningRef.current = true;
      // Record the timestamp when opening
      openedAtRef.current = Date.now();
      if (e) {
        // Store the click target that opens the dropdown
        openingClickTargetRef.current = e.target;
      }
      setSearchQuery("");
      setHighlightedIndex(-1);
    }
    
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (option: SearchableSelectOption) => {
    const optionValue = getOptionValue(option);
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (isOpen && filteredOptions.length === 1) {
          // If only one option matches, select it
          handleSelect(filteredOptions[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const displayValue = selectedOption ? getOptionLabel(selectedOption) : "";
  const showInput = isOpen;
  const inputValue = showInput ? searchQuery : displayValue;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="form-select w-full pr-8"
          readOnly={!isOpen}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(e);
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(e);
          }}
          disabled={disabled}
          className="absolute right-0 top-0 flex h-full items-center justify-center px-2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:cursor-not-allowed"
          tabIndex={-1}
        >
          <i
            className={`ri-arrow-${isOpen ? "up" : "down"}-s-line text-base`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {options.length === 0 ? emptyMessage : noOptionsMessage}
            </div>
          ) : (
            <ul className="py-1" role="listbox">
              {filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = value === optionValue;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={optionValue}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    className={`cursor-pointer px-4 py-2 text-sm transition-colors ${
                      isHighlighted || isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{optionLabel}</span>
                      {isSelected && (
                        <i className="ri-check-line ml-2 text-primary" aria-hidden="true" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

