// PRTable component - displays personal records with sorting
// Clickable rows navigate to session detail

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Award } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import type { PRItem } from "../../types";
import { cn } from "../../lib/utils/cn";

export interface PRTableProps {
  items: PRItem[];
  onRowClick: (setId: string) => void;
  sortBy?: "weight" | "date";
}

type SortField = "weight" | "date" | "exercise";
type SortDirection = "asc" | "desc";

export function PRTable({ items, onRowClick }: PRTableProps) {
  const [sortField, setSortField] = useState<SortField>("weight");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "weight":
          comparison = a.weight - b.weight;
          break;
        case "date":
          comparison =
            new Date(a.dateAchieved).getTime() -
            new Date(b.dateAchieved).getTime();
          break;
        case "exercise":
          comparison = a.exerciseName.localeCompare(b.exerciseName);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [items, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field - default to desc for weight, asc for others
      setSortField(field);
      setSortDirection(field === "weight" ? "desc" : "asc");
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const SortIcon = ({
    field,
    className,
  }: {
    field: SortField;
    className?: string;
  }) => {
    if (sortField !== field) {
      return <ArrowUpDown className={cn("h-4 w-4", className)} />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className={cn("h-4 w-4", className)} />
    ) : (
      <ArrowDown className={cn("h-4 w-4", className)} />
    );
  };

  if (items.length === 0) {
    return (
      <Card className="flex items-center justify-center h-80">
        <div className="text-center text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-lg font-medium">No personal records yet</p>
          <p className="text-sm mt-1">
            Start tracking workouts to see your PRs
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Personal Records</h3>
        <span className="text-sm text-muted-foreground">
          ({items.length} exercise{items.length !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("exercise")}
                  className="flex items-center gap-1 -ml-2"
                >
                  Exercise
                  <SortIcon field="exercise" />
                </Button>
              </th>
              <th className="text-right py-2 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("weight")}
                  className="flex items-center gap-1 ml-auto"
                >
                  Weight
                  <SortIcon field="weight" />
                </Button>
              </th>
              <th className="text-right py-2 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-1 ml-auto"
                >
                  Date
                  <SortIcon field="date" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr
                key={item.setId}
                onClick={() => onRowClick(item.setId)}
                className="border-b last:border-b-0 hover:bg-muted cursor-pointer transition-colors"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick(item.setId);
                  }
                }}
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.exerciseName}</span>
                    {item.isAlternative && (
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        Alt
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="font-semibold text-primary">
                    {item.weight.toFixed(1)} kg
                  </span>
                </td>
                <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                  {formatDate(item.dateAchieved)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show top 10 by default, with option to see more */}
      {items.length > 10 && sortedItems.length <= 10 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Showing top 10 PRs. Adjust filters to see more.
          </p>
        </div>
      )}
    </Card>
  );
}
