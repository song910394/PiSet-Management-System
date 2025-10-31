import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ResponsiveListProps<T> {
  items: T[];
  selectedItems: number[];
  onSelectItem: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (item: T) => void;
  onDelete: (id: number) => void;
  children: ReactNode; // Desktop table content
  getItemId: (item: T) => number;
  getItemName: (item: T) => string;
  getItemCategory?: (item: T) => string;
  getItemDetails: (item: T) => Array<{ label: string; value: string; className?: string }>;
  extraActions?: (item: T) => ReactNode;
  getCategoryBadgeColor?: (category: string) => string;
}

export function ResponsiveList<T>({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEdit,
  onDelete,
  children,
  getItemId,
  getItemName,
  getItemCategory,
  getItemDetails,
  extraActions,
  getCategoryBadgeColor,
}: ResponsiveListProps<T>) {
  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        {children}
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {/* Mobile header with select all */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedItems.length === items.length && items.length > 0}
              onCheckedChange={(c) => onSelectAll(!!c)}
              data-testid="checkbox-select-all-mobile"
            />
            <span className="text-sm font-medium">全選</span>
          </div>
          <span className="text-sm text-muted-foreground">
            共 {items.length} 項
          </span>
        </div>

        {/* Mobile cards */}
        {items.map((item) => {
          const itemId = getItemId(item);
          const itemName = getItemName(item);
          const itemCategory = getItemCategory?.(item);
          const details = getItemDetails(item);
          
          return (
            <Card key={itemId} className="p-4" data-testid={`card-item-${itemId}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Checkbox
                    checked={selectedItems.includes(itemId)}
                    onCheckedChange={(checked) => onSelectItem(itemId, !!checked)}
                    className="mt-1"
                    data-testid={`checkbox-item-${itemId}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-foreground truncate" data-testid={`text-item-name-${itemId}`}>
                        {itemName}
                      </h3>
                      {itemCategory && (
                        <Badge 
                          style={getCategoryBadgeColor ? { backgroundColor: getCategoryBadgeColor(itemCategory), color: 'white' } : undefined}
                          data-testid={`badge-category-${itemId}`}
                        >
                          {itemCategory}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {details.map((detail, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-muted-foreground">{detail.label}:</span>
                          <span className={detail.className || "font-medium"}>
                            {detail.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-1 ml-2">
                  {extraActions?.(item)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item)}
                    data-testid={`button-edit-${itemId}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(itemId)}
                    data-testid={`button-delete-${itemId}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}