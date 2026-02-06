import { SectionHeader } from "../components/layouts/SectionHeader";
import { BackupPanel } from "../components/settings/BackupPanel";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SectionHeader headerTitle="Settings"></SectionHeader>
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BackupPanel />
      </main>
    </div>
  );
}
