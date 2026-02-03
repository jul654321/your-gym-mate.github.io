import { useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Button } from "../ui/button";

interface ImportPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportPicker({ isOpen, onClose }: ImportPickerProps) {
  const [selectedFile, setSelectedFile] = useState<string>(
    "No file selected yet"
  );

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file?.name ?? "No file selected yet");
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-picker-title"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2
              id="import-picker-title"
              className="text-2xl font-semibold text-gray-900"
            >
              Import data
            </h2>
            <p className="text-sm text-gray-500">
              Upload a Gym Mate CSV, validate the schema, and resolve conflicts
              before importing.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close import modal"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </Button>
        </div>

        <div className="space-y-4 p-6 text-sm text-gray-600">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Select CSV file
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-primary focus:outline-none"
            />
          </label>
          <p className="text-xs text-gray-500" aria-live="polite">
            {selectedFile}
          </p>
          <p className="text-xs text-gray-500">
            The importer parses your CSV, surfaces validation results, and lets
            you confirm per-row actions before writing data. Imported rows stay
            in the undo trash until you confirm.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 px-6 py-4">
          <Button disabled className="flex-1 md:flex-none">
            Parse & validate (coming soon)
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            size="sm"
            className="text-gray-600"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
