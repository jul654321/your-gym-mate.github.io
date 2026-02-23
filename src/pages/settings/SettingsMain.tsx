import { Card } from "../../components/ui/card";

export function SettingsMain() {
  return (
    <Card theme="secondary" className="space-y-4" cardTitle="General settings">
      <p className="text-sm text-muted-foreground">
        General settings will appear here once available. For now, use the
        dedicated backups and exercises sections to manage the core metadata.
      </p>
    </Card>
  );
}
