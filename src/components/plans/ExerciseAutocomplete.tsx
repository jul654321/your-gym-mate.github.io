import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Autocomplete, type AutocompleteItem } from "../ui/autocomplete";
import type { ExerciseDTO } from "../../types";
import { useExercises, useCreateExercise } from "../../hooks/useExercises";
import { Label } from "../ui/label";

interface ExerciseAutocompleteProps {
  value?: string;
  onChange: (exerciseId: string, exercise: ExerciseDTO) => void;
  onClear?: () => void;
  placeholder?: string;
  label: string;
  error?: string;
  excludeIds?: string[];
}

export function ExerciseAutocomplete({
  value,
  onChange,
  onClear,
  placeholder = "Search exercises...",
  label,
  error,
  excludeIds = [],
}: ExerciseAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [clearedValue, setClearedValue] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);

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

  const trimmedQuery = query.trim();
  const createOptionId = `__create__:${trimmedQuery}`;

  const options: AutocompleteItem<ExerciseDTO>[] = [
    ...(trimmedQuery
      ? [
          {
            id: createOptionId,
            label: `Add "${trimmedQuery}"`,
            description: "Create new exercise",
          } as AutocompleteItem<ExerciseDTO>,
        ]
      : []),
    ...filteredExercises.map((exercise) => ({
      id: exercise.id,
      label: exercise.name,
      description: exercise.category,
      data: exercise,
    })),
  ];

  const showSelectedExercise =
    Boolean(selectedExercise) && clearedValue !== value && query.length === 0;
  const inputValue = showSelectedExercise ? selectedExercise!.name : query;

  const handleInputChange = (nextValue: string) => {
    setClearedValue(undefined);
    setQuery(nextValue);
  };

  const createMutation = useCreateExercise();

  const handleSelect = async (item: AutocompleteItem<ExerciseDTO>) => {
    if (item.id.startsWith("__create__:") && trimmedQuery.length > 0) {
      try {
        setIsCreating(true);
        const newExercise: ExerciseDTO = {
          id: uuidv4(),
          name: trimmedQuery,
          createdAt: Date.now(),
        };

        await createMutation.mutateAsync(newExercise);
        onChange(newExercise.id, newExercise);
        setQuery(newExercise.name);
        setClearedValue(undefined);
      } catch (err) {
        console.error("Failed to create exercise", err);
      } finally {
        setIsCreating(false);
      }

      return;
    }

    const exercise = item.data!;
    setClearedValue(undefined);
    setQuery(exercise.name);
    onChange(exercise.id, exercise);
  };

  const handleClear = () => {
    setQuery("");
    setClearedValue(value);
    onClear?.();
  };

  return (
    <div>
      <Label htmlFor={`${label}-${value}`}>{label}</Label>
      <Autocomplete
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={options}
        onSelectOption={handleSelect}
        placeholder={placeholder}
        error={error}
        loading={isFetching || isCreating}
        onClear={inputValue ? handleClear : undefined}
        noResultsMessage={trimmedQuery ? "No exercises found" : "No exercises"}
      />
    </div>
  );
}
