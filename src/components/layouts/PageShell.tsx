import { type ReactNode } from "react";
import { BottomTabBar } from "../navigation/BottomTabBar";
import { CenterFAB } from "../navigation/CenterFAB";
import { useNavigation } from "../../hooks";

export interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const { tabs, navigateTo, openQuickLogModal, navState } = useNavigation();

  return (
    <div className="flex h-screen flex-col bg-background text-gray-900 pb-18">
      {children}

      <BottomTabBar
        tabs={tabs}
        onTabActivate={navigateTo}
        centerSlot={
          <CenterFAB
            onOpen={openQuickLogModal}
            disabled={!navState.dbReady || navState.upgrading}
          />
        }
      />
    </div>
  );
}
