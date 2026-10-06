import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, AlertCircle, Check, X } from 'lucide-react';
import { findBestMatches, detectPossibleTypo, highlightMatches, type FuzzyMatch } from '../utils/fuzzyMatch';

/**
 * Smart Autocomplete Component with Fuzzy Matching and Typo Detection
 * 
 * Features:
 * - Real-time fuzzy search with debouncing
 * - Typo detection and confirmation
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Accessible (ARIA labels, roles)
 * - Mobile-friendly
 */

interface SmartAutocompleteProps<T> {
  value: string;
  onChange: (value: string, selectedItem: T | null) => void;
  options: T[];
  getLabel: (item: T) => string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  onCreateNew?: (value: string) => void;
  createNewLabel?: string;
  typoThreshold?: number;
  minSearchLength?: number;
  debounceMs?: number;
  className?: string;
  error?: string;
  helpText?: string;
}

export default function SmartAutocomplete<T>({
  value,
  onChange,
  options,
  getLabel,
  placeholder = 'Type to search...',
  label,
  disabled = false,
  onCreateNew,
  createNewLabel = 'Create new',
  typoThreshold = 70,
  minSearchLength = 2,
  debounceMs = 300,
  className = '',
  error,
  helpText
}: SmartAutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [matches, setMatches] = useState<FuzzyMatch<T>[]>([]);
  const [possibleTypo, setPossibleTypo] = useState<FuzzyMatch<T> | null>(null);
  const [showTypoWarning, setShowTypoWarning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.length < minSearchLength) {
      setMatches([]);
      setPossibleTypo(null);
      setShowTypoWarning(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Find matches
      const foundMatches = findBestMatches(searchTerm, options, getLabel, 50);
      setMatches(foundMatches);

      // Check for possible typo
      const typo = detectPossibleTypo(searchTerm, options, getLabel, typoThreshold);
      setPossibleTypo(typo);
      
      // Show warning if typo detected and not exact match
      if (typo && !typo.isExactMatch && typo.similarity >= typoThreshold) {
        setShowTypoWarning(true);
      } else {
        setShowTypoWarning(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, options, getLabel, typoThreshold, minSearchLength, debounceMs]);

  // Sync internal state with external value
  useEffect(() => {
    if (value !== searchTerm) {
      setSearchTerm(value);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue, null);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectItem = useCallback((item: T) => {
    const itemLabel = getLabel(item);
    setSearchTerm(itemLabel);
    onChange(itemLabel, item);
    setIsOpen(false);
    setShowTypoWarning(false);
    setPossibleTypo(null);
  }, [getLabel, onChange]);

  const handleUseExisting = () => {
    if (possibleTypo) {
      handleSelectItem(possibleTypo.item);
    }
  };

  const handleCreateNew = () => {
    setShowTypoWarning(false);
    setIsOpen(false);
    if (onCreateNew) {
      onCreateNew(searchTerm);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < matches.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < matches.length) {
          handleSelectItem(matches[highlightedIndex].item);
        } else if (showTypoWarning) {
          // If showing typo warning, Enter accepts the suggestion
          handleUseExisting();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setShowTypoWarning(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const shouldShowDropdown = isOpen && searchTerm.length >= minSearchLength && !showTypoWarning;
  const hasMatches = matches.length > 0;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-ink-secondary mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => searchTerm.length >= minSearchLength && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-10 pr-3 py-2 bg-bg border rounded-lg text-sm transition-colors ${
            error
              ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
              : 'border-border focus:ring-brand/20 focus:border-brand focus:ring-2 focus:outline-none'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={label}
          aria-autocomplete="list"
          aria-controls="autocomplete-dropdown"
          aria-expanded={shouldShowDropdown}
          autoComplete="off"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none" />
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="mt-1 text-xs text-ink-secondary">{helpText}</p>
      )}

      {/* Typo Warning */}
      {showTypoWarning && possibleTypo && (
        <div className="mt-2 p-3 bg-gold-bg border border-gold-border rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-gold-text flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gold-text">Did you mean this?</p>
              <p className="text-xs text-ink-secondary mt-0.5">
                "{getLabel(possibleTypo.item)}" is {possibleTypo.similarity}% similar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUseExisting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-on-brand text-xs rounded-lg hover:bg-brand-hover"
            >
              <Check size={14} />
              Use "{getLabel(possibleTypo.item)}"
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-ink text-xs rounded-lg hover:bg-bg"
            >
              <X size={14} />
              No, create "{searchTerm}"
            </button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {shouldShowDropdown && (
        <div
          ref={dropdownRef}
          id="autocomplete-dropdown"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {hasMatches ? (
            <ul className="py-1">
              {matches.map((match, index) => {
                const itemLabel = getLabel(match.item);
                const segments = highlightMatches(itemLabel, searchTerm);
                
                return (
                  <li
                    key={index}
                    role="option"
                    aria-selected={highlightedIndex === index}
                    onClick={() => handleSelectItem(match.item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      highlightedIndex === index
                        ? 'bg-brand text-on-brand'
                        : 'hover:bg-bg'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {segments.map((segment, i) => (
                          <span
                            key={i}
                            className={segment.isMatch ? 'font-semibold' : ''}
                          >
                            {segment.text}
                          </span>
                        ))}
                      </span>
                      {match.isExactMatch && (
                        <span className="text-xs text-ink-secondary ml-2">
                          Exact match
                        </span>
                      )}
                      {!match.isExactMatch && match.similarity >= 80 && (
                        <span className="text-xs text-ink-secondary ml-2">
                          {match.similarity}%
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-ink-secondary">
              No matches found. {onCreateNew && `Press Enter or continue to create "${searchTerm}".`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
