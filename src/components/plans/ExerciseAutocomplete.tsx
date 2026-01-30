import { useState, useRef, useEffect, useId } from "react";
import { useExercises } from "../../hooks/useExercises";
import type { ExerciseDTO } from "../../types";

interface ExerciseAutocompleteProps {
  value?: string; // exerciseId
  onChange: (exerciseId: string, exercise: ExerciseDTO) => void;
  placeholder?: string;
  label: string;
  error?: string;
  excludeIds?: string[]; // IDs to exclude from suggestions
}

export function ExerciseAutocomplete({
  value,
  onChange,
  placeholder = "Search exercises...",
  label,
  error,
  excludeIds = [],
}: ExerciseAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDTO | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const { data: exercises = [] } = useExercises({
    q: query,
    sort: "name",
    pagination: { pageSize: 10 },
  });

  // Filter out excluded IDs
  const filteredExercises = exercises.filter(
    (ex) => !excludeIds.includes(ex.id)
  );

  // Fetch all exercises for initial value lookup
  const { data: allExercises = [] } = useExercises({});

  // Load selected exercise if value provided
  useEffect(() => {
    if (value && !selectedExercise) {
      const exercise = allExercises.find((ex) => ex.id === value);
      if (exercise) {
        setSelectedExercise(exercise);
      }
    }
  }, [value, selectedExercise, allExercises]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (exercise: ExerciseDTO) => {
    setSelectedExercise(exercise);
    setQuery(exercise.name);
    setIsOpen(false);
    onChange(exercise.id, exercise);
  };

  const handleClear = () => {
    setSelectedExercise(null);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={selectedExercise ? selectedExercise.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (selectedExercise) {
              setSelectedExercise(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${inputId}-listbox`}
        />

        {selectedExercise && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown */}
      {isOpen && filteredExercises.length > 0 && (
        <div
          ref={dropdownRef}
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredExercises.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              role="option"
              aria-selected={selectedExercise?.id === exercise.id}
              onClick={() => handleSelect(exercise)}
              className="w-full text-left px-4 py-2 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none"
            >
              <div className="font-medium text-gray-900">{exercise.name}</div>
              {exercise.category && (
                <div className="text-xs text-gray-500">{exercise.category}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filteredExercises.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
          No exercises found
        </div>
      )}
    </div>
  );
}
