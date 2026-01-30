// Navigation-specific type definitions for Your Gym Mate.
// These mirror the implementation plan for the responsive nav shell.
export type TabId =
  | "sessions"
  | "home"
  | "plans"
  | "quickLog"
  | "dashboard"
  | "settings";

export interface TabDTO {
  id: TabId;
  label: string;
  path: string;
  icon: TabId; // icon key aligned with lucide icon mapping
  isCenter?: boolean;
}

export interface TabViewModel extends TabDTO {
  isActive: boolean;
  badgeCount?: number;
  disabled?: boolean;
}

export interface NavState {
  activeTab: TabId;
  dbReady: boolean;
  upgrading: boolean;
  updateAvailable: boolean;
}

export interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
  initialExerciseId?: string;
}
