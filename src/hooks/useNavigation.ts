import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDbInit } from "./useDbInit";
import type {
  TabDTO,
  TabId,
  TabViewModel,
  NavState,
} from "../types/navigation";

const TAB_DEFINITIONS: TabDTO[] = [
  {
    id: "sessions",
    label: "Sessions",
    path: "/sessions",
    icon: "sessions",
  },
  {
    id: "plans",
    label: "Plans",
    path: "/plans",
    icon: "plans",
  },
  {
    id: "quickLog",
    label: "Quick Log",
    path: "/quick-log",
    icon: "quickLog",
    isCenter: true,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: "settings",
  },
];

const DESTRUCTIVE_TABS: Set<TabId> = new Set([
  "home",
  "sessions",
  "plans",
  "dashboard",
  "settings",
]);

const DEFAULT_TAB: TabId = "home";

function getTabForPath(pathname: string): TabId {
  const normalizedPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  const match = TAB_DEFINITIONS.find((tab) => {
    const tabPath = tab.path.replace(/\/+$/, "") || "/";
    if (tabPath === "/") {
      return normalizedPath === "/";
    }
    if (normalizedPath === tabPath) {
      return true;
    }
    return normalizedPath.startsWith(`${tabPath}/`);
  });

  return match?.id ?? DEFAULT_TAB;
}

export interface UseNavigationResult {
  tabs: TabViewModel[];
  activeTab: TabId;
  navState: NavState;
  navigateTo: (tabId: TabId) => void;
  openQuickLogModal: () => void;
  updateAvailable: boolean;
  setUpdateAvailable: Dispatch<SetStateAction<boolean>>;
}

export function useNavigation(): UseNavigationResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInitialized, isLoading } = useDbInit();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const dbReady = isInitialized && !isLoading;
  const upgrading = false; // placeholder until migration tracking exists

  const activeTab = useMemo(
    () => getTabForPath(location.pathname),
    [location.pathname]
  );

  const tabs = useMemo(
    () =>
      TAB_DEFINITIONS.map((tab) => ({
        ...tab,
        isActive: tab.id === activeTab,
        disabled:
          (!dbReady || upgrading) &&
          (tab.id === "quickLog" || DESTRUCTIVE_TABS.has(tab.id)),
      })),
    [activeTab, dbReady, upgrading]
  );

  const openQuickLogModal = useCallback(() => {
    if (!dbReady || upgrading) {
      console.info("[useNavigation] Quick Log disabled until DB ready");
      return;
    }

    const sessionsTab = TAB_DEFINITIONS.find((tab) => tab.id === "sessions");
    if (!sessionsTab) {
      console.warn("[useNavigation] Sessions tab definition missing");
      return;
    }

    navigate(sessionsTab.path, {
      state: { openNewSession: true },
    });
  }, [dbReady, navigate, upgrading]);

  const navigateTo = useCallback(
    (tabId: TabId) => {
      const tab = TAB_DEFINITIONS.find((candidate) => candidate.id === tabId);
      if (!tab) {
        return;
      }

      if (tabId === "quickLog") {
        openQuickLogModal();
        return;
      }

      if (!dbReady || upgrading) {
        console.info(
          `[useNavigation] Navigation to ${tabId} blocked until DB ready`
        );
        return;
      }

      navigate(tab.path);
    },
    [dbReady, navigate, openQuickLogModal, upgrading]
  );

  const navState: NavState = {
    activeTab,
    dbReady,
    upgrading,
    updateAvailable,
  };

  return {
    tabs,
    activeTab,
    navState,
    navigateTo,
    openQuickLogModal,
    updateAvailable,
    setUpdateAvailable,
  };
}
