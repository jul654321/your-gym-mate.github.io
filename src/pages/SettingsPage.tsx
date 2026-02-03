import { BackupPanel } from "../components/settings/BackupPanel";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-primary/80">
            Configure how Your Gym Mate keeps your data safe and portable.
          </p>
        </div>
      </header>

      <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <BackupPanel />
      </main>
    </div>
  );
}
