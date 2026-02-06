import { SectionHeader } from "../components/layouts/SectionHeader";
import { SectionMain } from "../components/layouts/SectionMain";
import { BackupPanel } from "../components/settings/BackupPanel";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SectionHeader headerTitle="Settings"></SectionHeader>
      <SectionMain>
        <BackupPanel />
      </SectionMain>
    </div>
  );
}
