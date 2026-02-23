import { Outlet } from "react-router-dom";
import { SectionHeader } from "../layouts/SectionHeader";
import { SectionMain } from "../layouts/SectionMain";
import { SettingsNav } from "../settings/SettingsNav";
import { useDbInit } from "../../hooks/useDbInit";

export function SettingsRoutes() {
  const { ready, isLoading, error } = useDbInit();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Initializing settings…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-destructive">
          Unable to load settings: {error.message}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Settings unavailable.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SectionHeader headerTitle="Settings" />
      <SectionMain>
        <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
          <SettingsNav />
          <Outlet />
        </div>
      </SectionMain>
    </div>
  );
}
