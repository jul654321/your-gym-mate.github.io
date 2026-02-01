import { type ReactNode } from "react";
import { BottomTabBar } from "../navigation/BottomTabBar";
import { CenterFAB } from "../navigation/CenterFAB";
import { useNavigation } from "../../hooks";

export interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const { tabs, navigateTo, openQuickLogModal, navState } = useNavigation();
  console.log("test");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <main className="flex-1 pb-28">{children}</main>

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
