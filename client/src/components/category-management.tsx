import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Settings, GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: number;
  name: string;
  color?: string;
  sortOrder: number;
}

interface CategoryManagementProps {
  apiEndpoint: string;
  categoryLabel: string;
  categoryLabelShort?: string;
}

function SortableCategory({ 
  category, 
  onEdit, 
  onDelete, 
  isEditing, 
  editName, 
  editColor,
  onEditNameChange, 
  onEditColorChange,
  onSaveEdit, 
  onCancelEdit 
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  isEditing: boolean;
  editName: string;
  editColor: string;
  onEditNameChange: (value: string) => void;
  onEditColorChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-secondary rounded-md mb-2"
    >
      <div className="flex items-center flex-1 gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {isEditing ? (
          <>
            <Input
              type="color"
              value={editColor}
              onChange={(e) => onEditColorChange(e.target.value)}
              className="w-16 h-8 cursor-pointer"
            />
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveEdit();
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              autoFocus
            />
          </>
        ) : (
          <>
            <div
              className="w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: category.color || "#6B7280" }}
            />
            <span className="flex-1">{category.name}</span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSaveEdit}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(category)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function CategoryManagement({ 
  apiEndpoint, 
  categoryLabel,
  categoryLabelShort 
}: CategoryManagementProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6B7280");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("#6B7280");
  const [isDragSortMode, setIsDragSortMode] = useState(false);
  const [dragOrderedCategories, setDragOrderedCategories] = useState<Category[]>([]);

  const shortLabel = categoryLabelShort || categoryLabel;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [apiEndpoint],
  });

  const addCategoryMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => apiRequest("POST", apiEndpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      setShowAddDialog(false);
      setNewCategoryName("");
      setNewCategoryColor("#6B7280");
      toast({ title: `${shortLabel}分類已新增` });
    },
    onError: () => {
      toast({
        title: `新增${shortLabel}分類失敗`,
        description: "請檢查分類名稱後重試",
        variant: "destructive",
      });
    },
  });

  const editCategoryMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: number; name: string; color: string }) =>
      apiRequest("PUT", `${apiEndpoint}/${id}`, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      setEditingCategory(null);
      setEditCategoryName("");
      setEditCategoryColor("#6B7280");
      toast({ title: `${shortLabel}分類已更新` });
    },
    onError: () => {
      toast({
        title: `更新${shortLabel}分類失敗`,
        description: "請檢查分類名稱後重試",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `${apiEndpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({ title: `${shortLabel}分類已刪除` });
    },
    onError: () => {
      toast({
        title: `刪除${shortLabel}分類失敗`,
        description: `可能存在關聯的${categoryLabel}，請先刪除相關${categoryLabel}`,
        variant: "destructive",
      });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: (orderUpdates: { id: number; sortOrder: number }[]) =>
      apiRequest("POST", `${apiEndpoint}/reorder`, { orderUpdates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({ title: `${shortLabel}分類排序已更新` });
    },
  });

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategoryMutation.mutate({
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
    }
  };

  const handleEditCategory = () => {
    if (editingCategory && editCategoryName.trim()) {
      editCategoryMutation.mutate({
        id: editingCategory.id,
        name: editCategoryName.trim(),
        color: editCategoryColor,
      });
    }
  };

  const handleDeleteCategory = (category: Category) => {
    if (confirm(`確定要刪除分類「${category.name}」嗎？\n\n注意：此操作將會影響使用此分類的${categoryLabel}。`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color || "#6B7280");
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName("");
    setEditCategoryColor("#6B7280");
  };

  const handleDragSortToggle = () => {
    if (!isDragSortMode) {
      setDragOrderedCategories([...categories]);
    }
    setIsDragSortMode(!isDragSortMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = dragOrderedCategories.findIndex((cat) => cat.id === active.id);
      const newIndex = dragOrderedCategories.findIndex((cat) => cat.id === over.id);

      const newOrder = arrayMove(dragOrderedCategories, oldIndex, newIndex);
      setDragOrderedCategories(newOrder);

      const orderUpdates = newOrder.map((category, index) => ({
        id: category.id,
        sortOrder: index,
      }));

      reorderCategoriesMutation.mutate(orderUpdates);
    }
  };

  const displayCategories = isDragSortMode ? dragOrderedCategories : categories;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAddDialog(true)}
        data-testid="button-add-category"
      >
        <Plus className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">新增{shortLabel}分類</span>
        <span className="sm:hidden">新增分類</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowManageDialog(true)}
        data-testid="button-manage-categories"
      >
        <Settings className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">管理{shortLabel}分類</span>
        <span className="sm:hidden">管理分類</span>
      </Button>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增{categoryLabel}分類</DialogTitle>
            <DialogDescription>新增一個新的{categoryLabel}分類到系統中</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName">分類名稱 *</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="請輸入分類名稱"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    e.preventDefault();
                    handleAddCategory();
                  } else if (e.key === "Escape") {
                    setShowAddDialog(false);
                    setNewCategoryName("");
                  }
                }}
                autoFocus
                data-testid="input-category-name"
              />
            </div>

            <div>
              <Label htmlFor="categoryColor">分類顏色</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="categoryColor"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                  data-testid="input-category-color"
                />
                <span className="text-sm text-muted-foreground">{newCategoryColor}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewCategoryName("");
                }}
                data-testid="button-cancel-add"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                data-testid="button-confirm-add"
              >
                {addCategoryMutation.isPending ? "新增中..." : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理{categoryLabel}分類</DialogTitle>
            <DialogDescription>
              編輯或刪除現有的{categoryLabel}分類
              {isDragSortMode && <span className="ml-2 text-primary text-sm">拖拽排序模式</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <Button
              variant={isDragSortMode ? "default" : "outline"}
              size="sm"
              onClick={handleDragSortToggle}
              data-testid="button-toggle-sort"
            >
              <GripVertical className="h-4 w-4 mr-1" />
              {isDragSortMode ? "完成排序" : "拖拽排序"}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">尚無分類</p>
            ) : isDragSortMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayCategories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayCategories.map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      onEdit={startEditCategory}
                      onDelete={handleDeleteCategory}
                      isEditing={editingCategory?.id === category.id}
                      editName={editCategoryName}
                      editColor={editCategoryColor}
                      onEditNameChange={setEditCategoryName}
                      onEditColorChange={setEditCategoryColor}
                      onSaveEdit={handleEditCategory}
                      onCancelEdit={cancelEditCategory}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              displayCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-md"
                >
                  {editingCategory?.id === category.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        type="color"
                        value={editCategoryColor}
                        onChange={(e) => setEditCategoryColor(e.target.value)}
                        className="w-16 h-8 cursor-pointer"
                      />
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEditCategory();
                          } else if (e.key === "Escape") {
                            cancelEditCategory();
                          }
                        }}
                        autoFocus
                        data-testid={`input-edit-category-${category.id}`}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: category.color || "#6B7280" }}
                      />
                      <span className="flex-1" data-testid={`text-category-${category.id}`}>
                        {category.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {editingCategory?.id === category.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditCategory}
                          data-testid={`button-save-edit-${category.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEditCategory}
                          data-testid={`button-cancel-edit-${category.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditCategory(category)}
                          data-testid={`button-edit-category-${category.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category)}
                          data-testid={`button-delete-category-${category.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowManageDialog(false);
                cancelEditCategory();
              }}
              data-testid="button-close-manage"
            >
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
