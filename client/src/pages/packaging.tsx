import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Upload, Download, Plus, Edit, Trash2, TrendingUp, ArrowUpDown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { readExcelFile, exportToExcel } from "@/lib/excel-utils";
import { useToast } from "@/hooks/use-toast";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DraggableList } from "@/components/ui/draggable-list";
import { ResponsiveList } from "@/components/ui/responsive-list";
import PackagingModal from "@/components/modals/packaging-modal";
import type { Packaging, PackagingCategory } from "@shared/schema";

export default function PackagingPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<Packaging | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDragSortMode, setIsDragSortMode] = useState(false);
  const [dragOrderedPackaging, setDragOrderedPackaging] = useState<Packaging[]>([]);
  
  // 分類管理相關狀態
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCategoryManagementDialog, setShowCategoryManagementDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<PackagingCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isCategoryDragSortMode, setIsCategoryDragSortMode] = useState(false);
  const [dragOrderedCategories, setDragOrderedCategories] = useState<PackagingCategory[]>([]);

  const { data: packaging = [], isLoading } = useQuery<Packaging[]>({
    queryKey: ["/api/packaging", { search, type }],
  });

  // 查詢包裝分類
  const { data: categories = [] } = useQuery<PackagingCategory[]>({
    queryKey: ["/api/packaging-categories"],
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const filteredPackaging = useMemo(() => {
    let filtered = packaging.filter((item: Packaging) => {
      const matchesSearch = !search || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesType = type === "all" || item.type === type;
      return matchesSearch && matchesType;
    });

    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "unitCost":
            aValue = parseFloat(a.unitCost);
            bValue = parseFloat(b.unitCost);
            break;
          case "notes":
            aValue = (a.notes || "").toLowerCase();
            bValue = (b.notes || "").toLowerCase();
            break;
          case "updatedAt":
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
          if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        } else {
          const numA = Number(aValue);
          const numB = Number(bValue);
          if (numA < numB) return sortOrder === "asc" ? -1 : 1;
          if (numA > numB) return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [packaging, search, type, sortBy, sortOrder]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/packaging/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/packaging" });
      toast({ title: "包裝材料已刪除" });
    },
    onError: () => {
      toast({ title: "刪除失敗", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/packaging/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/packaging" });
      setSelectedItems([]);
      toast({ title: "批次刪除完成" });
    },
    onError: () => {
      toast({ title: "批次刪除失敗", variant: "destructive" });
    },
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

  // 分類排序的 mutation
  const reorderCategoriesMutation = useMutation({
    mutationFn: async (orderUpdates: { id: number; sortOrder: number }[]) => {
      return apiRequest("POST", "/api/packaging-categories/reorder", { orderUpdates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-categories"] });
      toast({
        title: "分類排序已更新",
      });
    },
    onError: () => {
      toast({
        title: "排序保存失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: Packaging) => {
    setEditingPackaging(item);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個包裝材料嗎？")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    if (confirm(`確定要刪除選中的 ${selectedItems.length} 個包裝材料嗎？`)) {
      bulkDeleteMutation.mutate(selectedItems);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(displayPackaging.map((p: Packaging) => p.id));
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

  // 分類管理處理函數
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

  // 分類拖拽排序處理函數
  const handleCategoryDragSortToggle = () => {
    if (!isCategoryDragSortMode) {
      setDragOrderedCategories([...categories]);
    }
    setIsCategoryDragSortMode(!isCategoryDragSortMode);
  };

  const handleCategoryReorder = async (newOrder: PackagingCategory[]) => {
    setDragOrderedCategories(newOrder);
    
    // 保存排序到資料庫
    const orderUpdates = newOrder.map((category, index) => ({
      id: category.id,
      sortOrder: index,
    }));
    
    reorderCategoriesMutation.mutate(orderUpdates);
  };

  const getCategoryColor = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || "#6B7280";
  };

  const handleDragSortToggle = () => {
    if (!isDragSortMode) {
      setDragOrderedPackaging([...filteredPackaging]);
    }
    setIsDragSortMode(!isDragSortMode);
  };

  const handleDragReorder = async (newOrder: Packaging[]) => {
    setDragOrderedPackaging(newOrder);
    
    // 保存排序到資料庫
    try {
      const orderUpdates = newOrder.map((packaging, index) => ({
        id: packaging.id,
        sortOrder: index,
      }));
      
      await apiRequest("POST", "/api/packaging/reorder", { orderUpdates });
      
      // 重新查詢資料以更新排序
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/packaging" });
    } catch (error) {
      toast({
        title: "排序保存失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    }
  };

  const displayPackaging = isDragSortMode ? dragOrderedPackaging : filteredPackaging;

  // 計算統計數據
  const averageCost = filteredPackaging.length > 0 
    ? filteredPackaging.reduce((sum: number, item: Packaging) => sum + parseFloat(item.unitCost), 0) / filteredPackaging.length
    : 0;

  const maxCostItem = filteredPackaging.reduce((max: Packaging | null, item: Packaging) => {
    if (!max || parseFloat(item.unitCost) > parseFloat(max.unitCost)) {
      return item;
    }
    return max;
  }, null);

  // Excel 匯入處理
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await readExcelFile(file);
    if (!result.success) {
      toast({
        title: "匯入失敗",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    try {
      const promises = result.data!.map((pack: any) => 
        apiRequest("POST", "/api/packaging", {
          name: pack.name || pack["包材名稱"] || "",
          type: pack.type || pack["類型"] || "其他",
          unitCost: parseFloat(pack.unitCost || pack["單位成本"] || "0").toString(),
          notes: pack.notes || pack["備註"] || "",
        })
      );

      await Promise.all(promises);
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/packaging" });
      toast({
        title: "匯入成功",
        description: `成功匯入 ${result.data!.length} 個包材`,
      });
    } catch (error) {
      toast({
        title: "匯入失敗",
        description: "處理包材資料時發生錯誤",
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  // Excel 匯出處理
  const handleExport = () => {
    const exportData = filteredPackaging.map((pack: Packaging) => ({
      "包材名稱": pack.name,
      "類型": pack.type,
      "單位成本": pack.unitCost,
      "備註": pack.notes || "",
    }));

    exportToExcel(exportData, "包裝材料管理", "包材清單");
    toast({
      title: "匯出成功",
      description: `已匯出 ${filteredPackaging.length} 個包材`,
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            <span className="sm:hidden">包材</span>
            <span className="hidden sm:inline">包裝材料管理</span>
          </h2>
          <p className="text-muted-foreground">
            <span className="sm:hidden">管理包材成本</span>
            <span className="hidden sm:inline">管理商品包裝材料和相關成本</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="import-packaging-file"
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => document.getElementById('import-packaging-file')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">批次匯入</span>
            <span className="sm:hidden">匯入</span>
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">批次匯出</span>
            <span className="sm:hidden">匯出</span>
          </Button>
          <Button 
            variant={isDragSortMode ? "default" : "outline"} 
            onClick={handleDragSortToggle}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{isDragSortMode ? "完成排序" : "拖拽排序"}</span>
            <span className="sm:hidden">{isDragSortMode ? "完成" : "排序"}</span>
          </Button>
          <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">新增分類</span>
            <span className="sm:hidden">分類+</span>
          </Button>
          <Button variant="outline" onClick={() => setShowCategoryManagementDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">管理分類</span>
            <span className="sm:hidden">管理</span>
          </Button>
          <Button onClick={() => { setEditingPackaging(null); setShowModal(true); }} className="bg-yellow-600 hover:bg-yellow-700">
            <Plus className="mr-2 h-4 w-4" />
            新增包裝材料
          </Button>
        </div>
      </div>

      {/* 包裝材料統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">包裝材料總數</p>
                <p className="text-2xl font-bold text-foreground">{packaging.length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-yellow-600 text-xl">📦</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">平均成本</p>
                <p className="text-2xl font-bold text-foreground">NT$ {averageCost.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-blue-600 text-xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">最高成本包材</p>
                <p className="text-lg font-bold text-foreground">
                  {maxCostItem?.name?.substring(0, 10) || "無"}
                  {maxCostItem?.name && maxCostItem.name.length > 10 ? "..." : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  NT$ {maxCostItem ? parseFloat(maxCostItem.unitCost).toFixed(1) : "0"}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingUp className="text-red-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 搜尋與篩選 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋包裝材料名稱..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="選擇種類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部種類</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="成本範圍" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="0-10">NT$ 0 - 10</SelectItem>
                <SelectItem value="11-20">NT$ 11 - 20</SelectItem>
                <SelectItem value="21-30">NT$ 21 - 30</SelectItem>
                <SelectItem value="30+">NT$ 30+</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => { setSearch(""); setType("all"); }}
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
      
      {/* 包裝材料表格 */}
      <Card>
        <CardHeader>
          <CardTitle>
            包裝材料清單 (共 {displayPackaging.length} 項包裝材料)
            {isDragSortMode && <span className="ml-2 text-primary text-sm">拖拽排序模式</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : packaging.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無包裝材料資料，請新增第一個包裝材料
            </div>
          ) : isDragSortMode ? (
            <div className="overflow-x-auto">
              <DraggableList
                items={displayPackaging}
                onReorder={handleDragReorder}
                keyExtractor={(packaging) => packaging.id.toString()}
                renderItem={(item: Packaging) => (
                  <div className="flex items-center border-b hover:bg-muted/50 p-4">
                    <div className="w-8 flex-shrink-0">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      />
                    </div>
                    <div className="flex-1 min-w-0 px-4">
                      <div className="font-medium">{item.name}</div>
                    </div>
                    <div className="w-20 flex-shrink-0 px-4">
                      <Badge style={{ backgroundColor: getCategoryColor(item.type), color: 'white' }}>
                        {item.type}
                      </Badge>
                    </div>
                    <div className="w-20 flex-shrink-0 px-4 text-center">
                      NT$ {parseFloat(item.unitCost).toFixed(1)}
                    </div>
                    <div className="w-32 flex-shrink-0 px-4 text-muted-foreground">
                      {item.notes || "-"}
                    </div>
                    <div className="w-24 flex-shrink-0 px-4 text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="w-20 flex-shrink-0">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          ) : (
            <ResponsiveList
              items={displayPackaging}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getItemId={(item) => item.id}
              getItemName={(item) => item.name}
              getItemCategory={(item) => item.type}
              getItemDetails={(item) => [
                { label: "成本", value: `NT$ ${parseFloat(item.unitCost).toFixed(1)}` },
                { label: "備註", value: item.notes || "-", className: "text-muted-foreground" },
                { label: "更新", value: new Date(item.updatedAt).toLocaleDateString(), className: "text-muted-foreground" }
              ]}
              getCategoryBadgeColor={getCategoryColor}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      <Checkbox
                        checked={selectedItems.length === displayPackaging.length && displayPackaging.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-4">
                      <SortableHeader 
                        label="包裝材料名稱" 
                        sortKey="name" 
                        currentSort={sortBy} 
                        currentOrder={sortOrder} 
                        onSort={handleSort} 
                      />
                    </th>
                    <th className="text-left p-4">
                      <SortableHeader 
                        label="種類" 
                        sortKey="type" 
                        currentSort={sortBy} 
                        currentOrder={sortOrder} 
                        onSort={handleSort} 
                      />
                    </th>
                    <th className="text-left p-4">
                      <SortableHeader 
                        label="單位成本" 
                        sortKey="unitCost" 
                        currentSort={sortBy} 
                        currentOrder={sortOrder} 
                        onSort={handleSort} 
                      />
                    </th>
                    <th className="text-left p-4">
                      <SortableHeader 
                        label="備註" 
                        sortKey="notes" 
                        currentSort={sortBy} 
                        currentOrder={sortOrder} 
                        onSort={handleSort} 
                      />
                    </th>
                    <th className="text-left p-4">
                      <SortableHeader 
                        label="最後更新" 
                        sortKey="updatedAt" 
                        currentSort={sortBy} 
                        currentOrder={sortOrder} 
                        onSort={handleSort} 
                      />
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPackaging.map((item: Packaging) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{item.name}</div>
                      </td>
                      <td className="p-4">
                        <Badge style={{ backgroundColor: getCategoryColor(item.type), color: 'white' }}>
                          {item.type}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium">
                        NT$ {parseFloat(item.unitCost).toFixed(1)}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {item.notes || "-"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            title="編輯包裝材料"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            title="刪除包裝材料"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveList>
          )}
        </CardContent>
      </Card>

      <PackagingModal
        open={showModal}
        onOpenChange={setShowModal}
        packaging={editingPackaging}
      />

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
              {isCategoryDragSortMode && <span className="ml-2 text-primary text-sm">拖拽排序模式</span>}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-between items-center mb-4">
            <Button 
              variant={isCategoryDragSortMode ? "default" : "outline"}
              size="sm"
              onClick={handleCategoryDragSortToggle}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {isCategoryDragSortMode ? "完成排序" : "排序分類"}
            </Button>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                尚未建立任何分類
              </p>
            ) : isCategoryDragSortMode ? (
              <DraggableList
                items={dragOrderedCategories.length > 0 ? dragOrderedCategories : categories}
                onReorder={handleCategoryReorder}
                keyExtractor={(category) => category.id.toString()}
                renderItem={(category: PackagingCategory) => (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <span className="font-medium">{category.name}</span>
                    <div className="text-sm text-muted-foreground">
                      拖拽重新排序
                    </div>
                  </div>
                )}
              />
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
    </div>
  );
}
