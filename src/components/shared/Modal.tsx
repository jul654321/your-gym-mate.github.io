import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "../ui/button";

interface ModalProps {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  actionButtons?: React.ReactNode[];
}

export function Modal({
  title = "Confirm action",
  children,
  onClose,
  actionButtons,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 pb-18"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="flex flex-col w-full max-w-md max-h-full max-h-[calc(100vh-4rem)] rounded-2xl bg-card shadow-xl"
      >
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id={titleId}
            className="text-lg font-semibold text-card-foreground"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </header>

        <main className="p-4 text-card-foreground text-sm overflow-y-auto">
          {children}
        </main>

        <div className="p-4 flex justify-end gap-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="ml-auto flex justify-end gap-3">
            {actionButtons?.map((button) => button)}
          </div>
        </div>
      </div>
    </div>
  );
}
