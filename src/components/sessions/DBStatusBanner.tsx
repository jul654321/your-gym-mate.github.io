import { Button } from "../ui/button";
import type { ReactNode } from "react";

interface DBStatusBannerProps {
  ready: boolean;
  upgrading: boolean;
  children?: ReactNode;
}

export function DBStatusBanner({
  ready,
  upgrading,
  children,
}: DBStatusBannerProps) {
  if (ready && !upgrading) {
    return null;
  }

  const message = upgrading
    ? "Database migration in progress. Actions are temporarily disabled."
    : "Database is still initializing. Some actions will be disabled until ready.";

  return (
    <div
      className="bg-gradient-to-r from-primary/90 to-teal-500 text-white px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="container mx-auto flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">{message}</p>
          {children}
        </div>
        {!ready && (
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-sm text-white hover:text-teal-100"
          >
            Reload
          </Button>
        )}
      </div>
    </div>
  );
}
