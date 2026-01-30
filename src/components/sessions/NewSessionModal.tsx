import { FormEvent, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function NewSessionModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  error,
}: NewSessionModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
    }
  }, [isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate(name);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Create New Session
          </h2>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Give your session a name (required). Leave blank to auto-generate one
          based on today’s date.
        </p>

        <div className="mt-4">
          <label className="sr-only" htmlFor="new-session-name">
            Session name
          </label>
          <Input
            id="new-session-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Session name"
          />
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="px-6">
            Create Session
          </Button>
        </div>
      </form>
    </div>
  );
}
