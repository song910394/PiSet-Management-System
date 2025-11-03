import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Upload, Download, Plus, Edit, Trash2, ArrowUpDown, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";
import MaterialModal from "@/components/modals/material-modal";
import MaterialHistoryModal from "@/components/modals/material-history-modal";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DraggableList } from "@/components/ui/draggable-list";
import { CategoryManagement } from "@/components/category-management";

import type { Material } from "@shared/schema";

export default function Materials() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMaterialId, setHistoryMaterialId] = useState<number>(0);
  const [historyMaterialName, setHistoryMaterialName] = useState<string>("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDragSortMode, setIsDragSortMode] = useState(false);
  const [dragOrderedMaterials, setDragOrderedMaterials] = useState<Material[]>([]);


  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: materialCategories = [] } = useQuery<{ id: number; name: string; color?: string; sortOrder: number }[]>({
    queryKey: ["/api/material-categories"],
  });

  const initCategoriesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/material-categories/init"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-categories"] });
    },
  });

  useEffect(() => {
    if (materials.length > 0 && materialCategories.length === 0) {
      initCategoriesMutation.mutate();
    }
  }, [materials.length, materialCategories.length]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const filteredMaterials = useMemo(() => {
    let filtered = materials.filter((material: Material) => {
      const matchesSearch = !search || 
        material.name.toLowerCase().includes(search.toLowerCase()) ||
        material.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || material.category === category;
      return matchesSearch && matchesCategory;
    });

    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "category":
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
          case "pricePerGram":
            aValue = parseFloat(a.pricePerGram);
            bValue = parseFloat(b.pricePerGram);
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [materials, search, category, sortBy, sortOrder]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({ title: "原料已刪除" });
    },
    onError: () => {
      toast({ title: "刪除失敗", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/materials/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setSelectedItems([]);
      toast({ title: "批次刪除完成" });
    },
    onError: () => {
      toast({ title: "批次刪除失敗", variant: "destructive" });
    },
  });

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setShowModal(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowModal(open);
    if (!open) {
      setEditingMaterial(null);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個原料嗎？")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    if (confirm(`確定要刪除選中的 ${selectedItems.length} 個原料嗎？`)) {
      bulkDeleteMutation.mutate(selectedItems);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredMaterials.map((m: Material) => m.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/materials/import", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("匯入失敗");
      }
      
      const result = await response.json();
      toast({ 
        title: "匯入完成", 
        description: result.message 
      });
      
      // 重新載入資料
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    } catch (error) {
      toast({ 
        title: "匯入失敗", 
        description: "請檢查檔案格式",
        variant: "destructive" 
      });
    }
    
    // 清除檔案選擇
    event.target.value = "";
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/materials/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "原料清單.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "匯出完成" });
    } catch (error) {
      toast({ title: "匯出失敗", variant: "destructive" });
    }
  };

  const getCategoryColor = (categoryName: string): string => {
    const category = materialCategories.find(cat => cat.name === categoryName);
    return category?.color || "#6B7280";
  };

  const handleDragSortToggle = () => {
    if (!isDragSortMode) {
      setDragOrderedMaterials([...filteredMaterials]);
    }
    setIsDragSortMode(!isDragSortMode);
  };

  const handleDragReorder = async (newOrder: Material[]) => {
    setDragOrderedMaterials(newOrder);
    
    // 保存排序到資料庫
    try {
      const orderUpdates = newOrder.map((material, index) => ({
        id: material.id,
        sortOrder: index,
      }));
      
      await apiRequest("POST", "/api/materials/reorder", { orderUpdates });
      
      // 重新查詢資料以更新排序
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    } catch (error) {
      toast({
        title: "排序保存失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    }
  };

  const displayMaterials = isDragSortMode ? dragOrderedMaterials : filteredMaterials;



  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-1 lg:mb-2">
            <span className="sm:hidden">原料</span>
            <span className="hidden sm:inline">原料管理</span>
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground">
            <span className="sm:hidden">管理原料及成本</span>
            <span className="hidden sm:inline">管理烘焙所需的所有原料及其成本</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="import-file"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">批次匯入</span>
            <span className="sm:hidden">匯入</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">批次匯出</span>
            <span className="sm:hidden">匯出</span>
          </Button>
          <Button 
            variant={isDragSortMode ? "default" : "outline"} 
            size="sm" 
            onClick={handleDragSortToggle}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{isDragSortMode ? "完成排序" : "拖拽排序"}</span>
            <span className="sm:hidden">{isDragSortMode ? "完成" : "排序"}</span>
          </Button>
          <CategoryManagement 
            apiEndpoint="/api/material-categories" 
            categoryLabel="原料"
          />
          <Button size="sm" onClick={() => { setEditingMaterial(null); setShowModal(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">新增原料</span>
            <span className="sm:hidden">新增</span>
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-full bg-primary/10 mr-3 lg:mr-4">
                <span className="text-primary text-base lg:text-lg">📦</span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">原料總數</p>
                <p className="text-lg lg:text-2xl font-bold text-foreground">{materials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 搜尋與篩選 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋原料名稱..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分類</SelectItem>
                  {materialCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => { setSearch(""); setCategory("all"); }}
                className="flex-1"
              >
                清除篩選
              </Button>
              {selectedItems.length > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除選中 ({selectedItems.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 原料表格 */}
      <Card>
        <CardHeader>
          <CardTitle>
            原料清單 (共 {displayMaterials.length} 項)
            {isDragSortMode && <span className="ml-2 text-primary text-sm">拖拽排序模式</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : displayMaterials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || category !== "all" ? "無符合條件的原料" : "尚無原料資料，請新增第一個原料"}
            </div>
          ) : (
            <>
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                {isDragSortMode ? (
                  <DraggableList
                    items={displayMaterials}
                    onReorder={handleDragReorder}
                    keyExtractor={(material) => material.id.toString()}
                    renderItem={(material: Material) => (
                      <div className="flex items-center border-b hover:bg-muted/50 p-3 lg:p-4">
                        <div className="w-8 flex-shrink-0">
                          <Checkbox
                            checked={selectedItems.includes(material.id)}
                            onCheckedChange={(checked) => handleSelectItem(material.id, !!checked)}
                          />
                        </div>
                        <div className="flex-1 min-w-0 px-4">
                          <div className="font-medium">{material.name}</div>
                          {material.notes && (
                            <div className="text-sm text-muted-foreground">{material.notes}</div>
                          )}
                        </div>
                        <div className="w-24 flex-shrink-0 px-4">
                          <Badge style={{ backgroundColor: getCategoryColor(material.category), color: 'white' }}>
                            {material.category}
                          </Badge>
                        </div>
                        <div className="w-24 flex-shrink-0 px-4">
                          {formatNumber(parseFloat(material.pricePerGram))}
                        </div>
                        <div className="w-24 flex-shrink-0 px-4 hidden lg:block text-muted-foreground">
                          {new Date(material.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(material)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(material.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 lg:p-4">
                          <Checkbox
                            checked={selectedItems.length === displayMaterials.length && displayMaterials.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left p-3 lg:p-4">
                          <SortableHeader 
                            label="原料名稱" 
                            sortKey="name" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-3 lg:p-4">
                          <SortableHeader 
                            label="分類" 
                            sortKey="category" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-3 lg:p-4">
                          <SortableHeader 
                            label="每克單價 (元)" 
                            sortKey="pricePerGram" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-3 lg:p-4 hidden lg:table-cell">最後更新</th>
                        <th className="text-left p-3 lg:p-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayMaterials.map((material: Material) => (
                        <tr key={material.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 lg:p-4">
                            <Checkbox
                              checked={selectedItems.includes(material.id)}
                              onCheckedChange={(checked) => handleSelectItem(material.id, !!checked)}
                            />
                          </td>
                          <td className="p-3 lg:p-4">
                            <div className="font-medium">{material.name}</div>
                            {material.notes && (
                              <div className="text-sm text-muted-foreground">{material.notes}</div>
                            )}
                          </td>
                          <td className="p-3 lg:p-4">
                            <Badge style={{ backgroundColor: getCategoryColor(material.category), color: 'white' }}>
                              {material.category}
                            </Badge>
                          </td>
                          <td className="p-3 lg:p-4">{formatNumber(parseFloat(material.pricePerGram))}</td>
                          <td className="p-3 lg:p-4 text-muted-foreground hidden lg:table-cell">
                            {new Date(material.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 lg:p-4">
                            <div className="flex space-x-1 lg:space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setHistoryMaterialId(material.id);
                                  setHistoryMaterialName(material.name);
                                  setShowHistoryModal(true);
                                }}
                                title="查看異動履歷"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(material)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(material.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 移動版卡片式佈局 */}
              <div className="md:hidden space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedItems.length === displayMaterials.length && displayMaterials.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">全選</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    共 {displayMaterials.length} 項
                  </span>
                </div>

                {isDragSortMode ? (
                  <DraggableList
                    items={displayMaterials}
                    onReorder={handleDragReorder}
                    keyExtractor={(material) => material.id.toString()}
                    renderItem={(material: Material) => (
                      <Card className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Checkbox
                              checked={selectedItems.includes(material.id)}
                              onCheckedChange={(checked) => handleSelectItem(material.id, !!checked)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-medium text-foreground truncate">
                                  {material.name}
                                </h3>
                                <Badge style={{ backgroundColor: getCategoryColor(material.category), color: 'white' }}>
                                  {material.category}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">單價:</span>
                                  <span className="font-medium">
                                    {formatNumber(parseFloat(material.pricePerGram))} 元/克
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">更新:</span>
                                  <span>{new Date(material.updatedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              
                              {material.notes && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {material.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHistoryMaterialId(material.id);
                                setHistoryMaterialName(material.name);
                                setShowHistoryModal(true);
                              }}
                              title="查看異動履歷"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(material)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(material.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  />
                ) : (
                  displayMaterials.map((material: Material) => (
                  <Card key={material.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                          checked={selectedItems.includes(material.id)}
                          onCheckedChange={(checked) => handleSelectItem(material.id, !!checked)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-foreground truncate">
                              {material.name}
                            </h3>
                            <Badge style={{ backgroundColor: getCategoryColor(material.category), color: 'white' }}>
                              {material.category}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">單價:</span>
                              <span className="font-medium">
                                {formatNumber(parseFloat(material.pricePerGram))} 元/克
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">更新:</span>
                              <span>{new Date(material.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {material.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {material.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setHistoryMaterialId(material.id);
                            setHistoryMaterialName(material.name);
                            setShowHistoryModal(true);
                          }}
                          title="查看異動履歷"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(material)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(material.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <MaterialModal
        open={showModal}
        onOpenChange={handleModalClose}
        material={editingMaterial}
      />
      
      <MaterialHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        materialId={historyMaterialId}
        materialName={historyMaterialName}
      />
    </div>
  );
}
