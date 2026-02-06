import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils/cn";
import { Button } from "./button";
import { Input } from "./input";

export interface AutocompleteItem<T = unknown> {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  data?: T;
}

export interface AutocompleteProps<T = unknown> {
  inputValue: string;
  options?: AutocompleteItem<T>[];
  onInputChange: (value: string) => void;
  onSelectOption: (option: AutocompleteItem<T>) => void;
  onClear?: () => void;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  noResultsMessage?: string;
  inputId?: string;
  className?: string;
}

export function Autocomplete<T>({
  inputValue,
  options = [],
  onInputChange,
  onSelectOption,
  onClear,
  placeholder,
  error,
  loading = false,
  noResultsMessage = "No results found.",
  inputId,
  className,
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const resolvedId = inputId ?? `autocomplete-${generatedId}`;
  const listboxId = `${resolvedId}-listbox`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const showList =
    isOpen && (loading || options.length > 0 || inputValue.length > 0);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onInputChange(event.target.value);
    setHighlightedIndex(0);
    setIsOpen(true);
  };

  const handleSelect = (item: AutocompleteItem<T>) => {
    onSelectOption(item);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!options.length) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(
        (prev) => (prev - 1 + options.length) % options.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = options[highlightedIndex];
      if (item) {
        handleSelect(item);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onClear?.();
    onInputChange("");
    inputRef.current?.focus();
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      <div className="relative">
        <Input
          id={resolvedId}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex h-11 w-full rounded-md border bg-card px-3 py-2 text-sm text-card-foreground transition duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-red-500 focus-visible:ring-red-500"
              : "border-gray-600 focus-visible:ring-primary/60",
            className
          )}
          hasError={Boolean(error)}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showList}
          aria-activedescendant={options[highlightedIndex]?.id}
          autoComplete="off"
        />

        {onClear && inputValue.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label="Clear selection"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M10 8.586 5.293 3.879 4.293 4.879 8.586 9.172 4.293 13.465 5.293 14.465 10 9.758 14.707 14.465 15.707 13.465 11.414 9.172 15.707 4.879 14.707 3.879Z"
              />
            </svg>
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {showList && (
        <div className="relative">
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
          >
            {loading && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                Loading…
              </li>
            )}
            {!loading && options.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                {noResultsMessage}
              </li>
            )}
            {!loading &&
              options.map((option, index) => {
                const isActive = index === highlightedIndex;
                return (
                  <li key={option.id}>
                    <Button
                      variant="ghost"
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "w-full justify-between text-left px-4 py-3 transition-colors duration-150",
                        isActive
                          ? "bg-muted text-muted-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex gap-1 items-center w-full text-left">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{option.label}</span>
                          {option.meta && (
                            <span className="text-xs text-muted-foreground">
                              {option.meta}
                            </span>
                          )}
                        </div>
                        {option.description && (
                          <p className="text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </Button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
