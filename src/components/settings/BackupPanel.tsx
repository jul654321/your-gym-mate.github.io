import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ExportSheet } from "./ExportSheet";
import { ImportPicker } from "./ImportPicker";
import { getDB, STORE_NAMES } from "../../lib/db";
import { useGetSetting } from "../../hooks/useSettings";

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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Backup & Restore
          </p>
          <h2 className="text-xl font-semibold text-gray-900">
            Keep your data under your control
          </h2>
        </div>
        <p className="text-xs font-semibold text-primary">
          {lastExportAt ? "Last export recorded" : "No exports yet"}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-gray-100 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Last export</p>
          <p className="text-sm font-semibold text-gray-900">
            {lastExportLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-100 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Database estimate</p>
          <p className="text-sm font-semibold text-gray-900">
            {dbEstimateLabel}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => setIsExportOpen(true)}>Export data</Button>
        <Button
          variant="outline"
          onClick={() => setIsImportOpen(true)}
          className="text-primary"
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
    </section>
  );
}
