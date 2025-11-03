import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Packaging, InsertPackaging, PackagingCategory } from "@shared/schema";

interface PackagingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packaging?: Packaging | null;
}

export default function PackagingModal({ open, onOpenChange, packaging }: PackagingModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertPackaging>({
    name: "",
    type: "",
    unitCost: "0",
    notes: "",
  });
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCategoryManagementDialog, setShowCategoryManagementDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<PackagingCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // 查詢包裝分類
  const { data: categories = [] } = useQuery<PackagingCategory[]>({
    queryKey: ["/api/packaging-categories"],
  });

  // 新增分類的 mutation
  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/packaging-categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-categories"] });
      setShowCategoryDialog(false);
      setNewCategoryName("");
      toast({
        title: "分類已新增",
      });
    },
    onError: () => {
      toast({
        title: "新增分類失敗",
        description: "請檢查分類名稱後重試",
        variant: "destructive",
      });
    },
  });

  // 編輯分類的 mutation
  const editCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => 
      apiRequest("PUT", `/api/packaging-categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-categories"] });
      setEditingCategory(null);
      setEditCategoryName("");
      toast({
        title: "分類已更新",
      });
    },
    onError: () => {
      toast({
        title: "更新分類失敗",
        description: "請檢查分類名稱後重試",
        variant: "destructive",
      });
    },
  });

  // 刪除分類的 mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/packaging-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-categories"] });
      toast({
        title: "分類已刪除",
      });
    },
    onError: () => {
      toast({
        title: "刪除分類失敗",
        description: "可能存在關聯的包裝材料，請先刪除相關材料",
        variant: "destructive",
      });
    },
  });

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategoryMutation.mutate(newCategoryName.trim());
    }
  };

  const handleEditCategory = () => {
    if (editingCategory && editCategoryName.trim()) {
      editCategoryMutation.mutate({ 
        id: editingCategory.id, 
        name: editCategoryName.trim() 
      });
    }
  };

  const handleDeleteCategory = (category: PackagingCategory) => {
    if (confirm(`確定要刪除分類「${category.name}」嗎？\n\n注意：此操作將會影響使用此分類的包裝材料。`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const startEditCategory = (category: PackagingCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName("");
  };

  useEffect(() => {
    if (packaging) {
      setFormData({
        name: packaging.name,
        type: packaging.type,
        unitCost: packaging.unitCost,
        notes: packaging.notes || "",
      });
    } else {
      setFormData({
        name: "",
        type: "",
        unitCost: "0",
        notes: "",
      });
    }
  }, [packaging, open]);

  const mutation = useMutation({
    mutationFn: (data: InsertPackaging) => {
      if (packaging) {
        return apiRequest("PUT", `/api/packaging/${packaging.id}`, data);
      } else {
        return apiRequest("POST", "/api/packaging", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/packaging" });
      onOpenChange(false);
      toast({
        title: packaging ? "包裝材料已更新" : "包裝材料已新增",
      });
    },
    onError: () => {
      toast({
        title: "操作失敗",
        description: "請檢查輸入資料後重試",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.type || !formData.unitCost) {
      toast({
        title: "請填寫必填欄位",
        description: "包裝材料名稱、種類和單位成本為必填欄位",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(formData.unitCost) < 0) {
      toast({
        title: "成本不能為負數",
        description: "請輸入有效的成本",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <>
      <ResponsiveDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title={packaging ? "編輯包材" : "新增包材"}
      description={packaging ? "修改包裝材料的基本資訊和成本" : "新增一個新的包裝材料到系統中"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="packaging-form" disabled={mutation.isPending}>
            {mutation.isPending ? "儲存中..." : "儲存"}
          </Button>
        </>
      }
    >
      <form id="packaging-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">包裝材料名稱 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="請輸入包裝材料名稱"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="type">種類 *</Label>
          <div className="flex space-x-2">
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="請選擇種類" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryDialog(true)}
                className="px-3"
                title="新增分類"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryManagementDialog(true)}
                className="px-3"
                title="管理分類"
              >
                管理
              </Button>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="unitCost">單位成本 (NT$) *</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            min="0"
            value={formData.unitCost}
            onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="notes">備註</Label>
          <Textarea
            id="notes"
            value={formData.notes ?? ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="請輸入備註資訊"
            rows={3}
          />
        </div>
      </form>
    </ResponsiveDialog>

      {/* 新增分類對話框 */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增包裝分類</DialogTitle>
            <DialogDescription>
              新增一個新的包裝分類到系統中
            </DialogDescription>
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
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    e.preventDefault();
                    handleAddCategory();
                  } else if (e.key === 'Escape') {
                    setShowCategoryDialog(false);
                    setNewCategoryName("");
                  }
                }}
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowCategoryDialog(false);
                  setNewCategoryName("");
                }}
              >
                取消
              </Button>
              <Button 
                type="button"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
              >
                {addCategoryMutation.isPending ? "新增中..." : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 管理分類對話框 */}
      <Dialog open={showCategoryManagementDialog} onOpenChange={setShowCategoryManagementDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理包裝分類</DialogTitle>
            <DialogDescription>
              編輯或刪除現有的包裝分類
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                尚未建立任何分類
              </p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  {editingCategory?.id === category.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        placeholder="請輸入分類名稱"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editCategoryName.trim()) {
                            e.preventDefault();
                            handleEditCategory();
                          } else if (e.key === 'Escape') {
                            cancelEditCategory();
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleEditCategory}
                        disabled={!editCategoryName.trim() || editCategoryMutation.isPending}
                      >
                        {editCategoryMutation.isPending ? "儲存中..." : "儲存"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelEditCategory}
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{category.name}</span>
                      <div className="flex space-x-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEditCategory(category)}
                          className="px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCategory(category)}
                          className="px-2 hover:bg-red-50 hover:text-red-600"
                          disabled={deleteCategoryMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowCategoryManagementDialog(false);
                cancelEditCategory();
              }}
            >
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
