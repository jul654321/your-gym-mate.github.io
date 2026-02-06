import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ExportSheet } from "./ExportSheet";
import { getDB, STORE_NAMES } from "../../lib/db";
import { useGetSetting } from "../../hooks/useSettings";
import { ImportPicker } from "./ImportPicker";
import { Card } from "../ui/card";

interface DbEstimate {
  sessionCount: number;
  loggedSetCount: number;
}

export function BackupPanel() {
  const { data: lastExportAt } = useGetSetting<number>("lastExportAt", {
    cacheTime: 1000 * 60 * 5,
  });
  const [dbEstimate, setDbEstimate] = useState<DbEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function calculateEstimate() {
      try {
        const db = await getDB();
        const tx = db.transaction(
          [STORE_NAMES.sessions, STORE_NAMES.loggedSets],
          "readonly"
        );
        const sessionsStore = tx.objectStore(STORE_NAMES.sessions);
        const loggedSetsStore = tx.objectStore(STORE_NAMES.loggedSets);
        const sessionCount = await sessionsStore.count();
        const loggedSetCount = await loggedSetsStore.count();
        await tx.done;
        if (!isCancelled) {
          setDbEstimate({ sessionCount, loggedSetCount });
        }
      } catch (error) {
        console.error("[BackupPanel] Unable to estimate DB size", error);
      } finally {
        if (!isCancelled) {
          setIsEstimating(false);
        }
      }
    }

    calculateEstimate();
    return () => {
      isCancelled = true;
    };
  }, []);

  const lastExportLabel = lastExportAt
    ? new Date(lastExportAt).toLocaleString()
    : "Never exported";

  const dbEstimateLabel = dbEstimate
    ? `${dbEstimate.sessionCount} sessions · ${dbEstimate.loggedSetCount} sets`
    : isEstimating
    ? "Estimating…"
    : "Estimate unavailable";

  return (
    <Card cardHeader={<>Backup & Restore</>}>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card
          theme="secondary"
          cardHeader={<p className="text-xs text-gray-500">Last export</p>}
          cardFooter={
            <p className="text-sm text-muted-foreground font-semibold">
              {lastExportLabel}
            </p>
          }
        />
        <Card
          theme="secondary"
          cardHeader={
            <p className="text-xs text-gray-500">Database estimate</p>
          }
          cardFooter={
            <p className="text-sm text-muted-foreground font-semibold">
              {dbEstimateLabel}
            </p>
          }
        />
      </div>

      <div className="w-full mt-6 flex flex-wrap gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsExportOpen(true)}
          className="flex-1"
        >
          Export data
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setIsImportOpen(true)}
          className="flex-1"
        >
          Import data
        </Button>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        All backup operations happen locally. CSV files stay on your device
        until you explicitly share them.
      </p>

      <ExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
      <ImportPicker
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </Card>
  );
}
