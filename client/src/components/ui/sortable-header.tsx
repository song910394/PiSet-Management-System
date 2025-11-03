import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string | null;
  currentOrder: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  currentOrder, 
  onSort,
  className 
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;
  
  return (
    <th className={cn("text-left p-4 font-medium text-muted-foreground", className)}>
      <Button
        variant="ghost"
        className="h-auto p-0 justify-start font-medium hover:bg-transparent"
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        {isActive ? (
          currentOrder === "asc" ? (
            <ChevronUp className="ml-1 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-1 h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
        )}
      </Button>
    </th>
  );
}