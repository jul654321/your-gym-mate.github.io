// TotalsCard component - displays summary statistics
// Compact card showing total volume, session count, and averages

import { TrendingUp, Calendar, BarChart3 } from "lucide-react";
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
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Total Sessions",
      value: formatNumber(totals.totalSessions),
      unit: "",
      icon: Calendar,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Avg Session Volume",
      value: formatDecimal(totals.avgSessionVolume),
      unit: "kg",
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Summary</h3>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${stat.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="flex-1">
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
            </div>
          );
        })}
      </div>

      {/* Additional insights */}
      {totals.totalSessions > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            You've logged {formatNumber(totals.totalVolume)} kg across{" "}
            {totals.totalSessions} session{totals.totalSessions !== 1 ? "s" : ""}
            .
          </p>
        </div>
      )}
    </Card>
  );
}
