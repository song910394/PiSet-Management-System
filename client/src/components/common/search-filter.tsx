import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    options: FilterOption[];
  }[];
  onClearFilters: () => void;
  extraActions?: React.ReactNode;
}

export default function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜尋...",
  filters = [],
  onClearFilters,
  extraActions,
}: SearchFilterProps) {
  const hasActiveFilters = searchValue || filters.some(filter => filter.value);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 搜尋欄位 */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-10"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* 篩選器 */}
        {filters.map((filter, index) => (
          <div key={index}>
            <Select value={filter.value} onValueChange={filter.onValueChange}>
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        
        {/* 清除篩選和額外操作 */}
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              清除篩選
            </Button>
          )}
          {extraActions}
        </div>
      </div>
    </div>
  );
}
