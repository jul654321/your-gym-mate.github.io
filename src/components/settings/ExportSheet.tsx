import type { MouseEvent } from "react";
import { Button } from "../ui/button";

interface ExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportSheet({ isOpen, onClose }: ExportSheetProps) {
  if (!isOpen) {
    return null;
  }

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
      aria-labelledby="export-sheet-title"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2
              id="export-sheet-title"
              className="text-2xl font-semibold text-gray-900"
            >
              Export data
            </h2>
            <p className="text-sm text-gray-500">
              Stream sessions and logged sets into a CSV using scoped filters
              and toggles.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close export modal"
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
          <p>
            Export will stream CSV rows in batches to avoid high memory usage.
            Future controls will allow you to pick a date range, include
            alternatives, and preview export estimates.
          </p>
          <p>
            When finished, we’ll offer the file through the Web Share API (if
            available) or download it automatically so you can keep your data
            anywhere you like.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 px-6 py-4">
          <Button disabled className="flex-1 md:flex-none">
            Start export (coming soon)
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
