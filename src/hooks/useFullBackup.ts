import { useCallback, useState } from "react";
import { exportFullBackupToFile, type FullBackupV1 } from "../lib/utils/exportFullBackup";
import { useUpdateSetting } from "./useSettings";

export function useFullBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const updateSetting = useUpdateSetting();

  const exportFull = useCallback(async (): Promise<FullBackupV1 | null> => {
    if (isExporting) {
      return null;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const backup = await exportFullBackupToFile();
      await updateSetting.mutateAsync({
        key: "lastExportAt",
        value: Date.now(),
      });
      return backup;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to export full backup.";
      setExportError(message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, updateSetting]);

  return {
    isExporting,
    exportError,
    exportFull,
  };
}
