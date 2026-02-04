import { ImportPickerView } from "./ImportPickerView";
import { useImportPickerLogic } from "./useImportPickerLogic";

interface ImportPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportPicker({ isOpen, onClose }: ImportPickerProps) {
  const logic = useImportPickerLogic({ onClose });

  if (!isOpen) {
    return null;
  }

  return <ImportPickerView {...logic} />;
}
