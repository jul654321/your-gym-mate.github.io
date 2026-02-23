import { BackupPanel } from "../../components/settings/BackupPanel";

export function BackupPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Backup
        </p>
        <h2 className="text-2xl font-semibold text-foreground">
          Backup & Restore
        </h2>
      </header>
      <BackupPanel />
    </section>
  );
}
