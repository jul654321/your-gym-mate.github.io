// TotalsCard component - displays summary statistics
// Compact card showing total volume, session count, and averages

import { Card } from "../ui/card";
import type { TotalsViewModel } from "../../types";

export interface TotalsCardProps {
  totals: TotalsViewModel;
}

export function TotalsCard({ totals }: TotalsCardProps) {
  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  // Format with decimal
  const formatDecimal = (num: number) => {
    return num.toFixed(1);
  };

  const stats = [
    {
      label: "Total Volume",
      value: formatNumber(totals.totalVolume),
      unit: "kg",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Total Sessions",
      value: formatNumber(totals.totalSessions),
      unit: "",
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Avg Session",
      value: formatDecimal(totals.avgSessionVolume),
      unit: "kg",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <Card>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => {
          return (
            <div key={stat.label}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold">
                {stat.value}
                {stat.unit && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {stat.unit}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
