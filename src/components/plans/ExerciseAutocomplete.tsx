import { useMemo, useState } from "react";
import { useExercises } from "../../hooks/useExercises";
import { Autocomplete, type AutocompleteItem } from "../ui/autocomplete";
import type { ExerciseDTO } from "../../types";

interface ExerciseAutocompleteProps {
  value?: string;
  onChange: (exerciseId: string, exercise: ExerciseDTO) => void;
  placeholder?: string;
  label: string;
  error?: string;
  excludeIds?: string[];
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
  const [clearedValue, setClearedValue] = useState<string | undefined>();

  const { data: exercises = [], isFetching } = useExercises({
    q: query,
    sort: "name",
    pagination: { pageSize: 10 },
  });

  const { data: allExercises = [] } = useExercises({});

  const selectedExercise = useMemo(() => {
    if (!value) {
      return null;
    }

    return allExercises.find((item) => item.id === value) ?? null;
  }, [allExercises, value]);

  const filteredExercises = exercises.filter(
    (exercise) => !excludeIds.includes(exercise.id)
  );

  const options: AutocompleteItem<ExerciseDTO>[] = filteredExercises.map(
    (exercise) => ({
      id: exercise.id,
      label: exercise.name,
      description: exercise.category,
      data: exercise,
    })
  );

  const showSelectedExercise =
    Boolean(selectedExercise) && clearedValue !== value && query.length === 0;
  const inputValue = showSelectedExercise ? selectedExercise!.name : query;

  const handleInputChange = (nextValue: string) => {
    setClearedValue(undefined);
    setQuery(nextValue);
  };

  const handleSelect = (item: AutocompleteItem<ExerciseDTO>) => {
    const exercise = item.data!;
    setClearedValue(undefined);
    setQuery(exercise.name);
    onChange(exercise.id, exercise);
  };

  const handleClear = () => {
    setQuery("");
    setClearedValue(value);
  };

  return (
    <Autocomplete
      label={label}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      onSelectOption={handleSelect}
      placeholder={placeholder}
      error={error}
      loading={isFetching}
      onClear={inputValue ? handleClear : undefined}
      noResultsMessage="No exercises found"
    />
  );
}
