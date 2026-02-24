import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Modal } from "../../shared/Modal";
import type { CreateExerciseCmd, ExerciseType } from "../../../types";

export interface ExerciseEditorPayload {
  name: string;
  category?: string;
  equipment?: string[];
  notes?: string;
  exerciseType?: ExerciseType;
}

interface ExerciseEditorModalProps {
  open: boolean;
  exercise?: Partial<CreateExerciseCmd> & { id?: string };
  isSaving?: boolean;
  onClose: () => void;
  onSave: (payload: ExerciseEditorPayload) => void;
}

export function ExerciseEditorModal({
  open,
  exercise,
  isSaving = false,
  onClose,
  onSave,
}: ExerciseEditorModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [equipmentText, setEquipmentText] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseType, setExerciseType] =
    useState<ExerciseType>("Bilateral");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(exercise?.name ?? "");
    setCategory(exercise?.category ?? "");
    setEquipmentText(
      Array.isArray(exercise?.equipment) ? exercise.equipment.join(", ") : ""
    );
    setNotes(exercise?.notes ?? "");
    setExerciseType(exercise?.exerciseType ?? "Bilateral");
  }, [exercise, open]);

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length > 0 && trimmedName.length <= 100;

  const isSaveDisabled = useMemo(
    () => !isNameValid || isSaving,
    [isNameValid, isSaving]
  );

  const handleSave = () => {
    if (isSaveDisabled) {
      return;
    }

    const equipment = equipmentText
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    onSave({
      name: trimmedName,
      category: category.trim() || undefined,
      equipment: equipment.length > 0 ? equipment : undefined,
      notes: notes.trim() || undefined,
      exerciseType,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      title={exercise?.id ? "Edit exercise" : "Add exercise"}
      onClose={onClose}
      actionButtons={[
        <Button
          key="save"
          variant="primary"
          onClick={handleSave}
          disabled={isSaveDisabled}
          isLoading={isSaving}
        >
          Save
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Overhead Press"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/60"
            maxLength={100}
            required
            autoFocus
          />
          {!isNameValid && (
            <span className="text-xs text-destructive">
              Exercise name is required (max 100 characters).
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground">Category</span>
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="e.g. Push, Legs, Cardio"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/60"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground">Equipment</span>
          <input
            type="text"
            value={equipmentText}
            onChange={(event) => setEquipmentText(event.target.value)}
            placeholder="Comma-separated list (Barbell, Dumbbells)"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/60"
          />
          <span className="text-xs text-muted-foreground">
            Optional; used to build filters.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional notes or description"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/60"
          />
        </label>
        <fieldset className="space-y-2 text-sm">
          <legend className="font-semibold text-foreground">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["Bilateral", "Unilateral"] as ExerciseType[]).map((type) => {
              const isSelected = exerciseType === type;
              return (
                <label
                  key={type}
                  className={`flex items-center justify-center rounded-md border px-3 py-2 text-xs font-medium ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="exercise-type"
                    value={type}
                    checked={isSelected}
                    onChange={() => setExerciseType(type)}
                    className="sr-only"
                  />
                  {type}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
