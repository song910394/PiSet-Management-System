import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Download, Plus, Edit, Trash2, Copy, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";
import { readExcelFile, exportToExcel } from "@/lib/excel-utils";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DraggableList } from "@/components/ui/draggable-list";
import { CategoryManagement } from "@/components/category-management";

import RecipeModal from "@/components/modals/recipe-modal";
import type { RecipeWithIngredients, Material } from "@shared/schema";

export default function Recipes() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDragSortMode, setIsDragSortMode] = useState(false);
  const [dragOrderedRecipes, setDragOrderedRecipes] = useState<RecipeWithIngredients[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery<RecipeWithIngredients[]>({
    queryKey: ["/api/recipes", { search, category }],
  });

  const { data: recipeCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number; color?: string }[]>({
    queryKey: ["/api/recipe-categories"],
  });

  const initCategoriesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/recipe-categories/init"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipe-categories"] });
    },
  });

  useEffect(() => {
    if (recipes.length > 0 && recipeCategories.length === 0) {
      initCategoriesMutation.mutate();
    }
  }, [recipes.length, recipeCategories.length]);

  const filteredRecipes = useMemo(() => {
    let filtered = recipes.filter((recipe: RecipeWithIngredients) => {
      const matchesSearch = !search || 
        recipe.name.toLowerCase().includes(search.toLowerCase()) ||
        recipe.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || recipe.category === category;
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
          case "totalPortions":
            aValue = parseFloat((a.totalPortions || 0).toString());
            bValue = parseFloat((b.totalPortions || 0).toString());
            break;
          case "totalWeight":
            aValue = parseFloat((a.totalWeight || 0).toString());
            bValue = parseFloat((b.totalWeight || 0).toString());
            break;
          case "totalCost":
            aValue = a.totalCost || 0;
            bValue = b.totalCost || 0;
            break;
          case "costPerPortion":
            aValue = a.costPerPortion || 0;
            bValue = b.costPerPortion || 0;
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
  }, [recipes, search, category, sortBy, sortOrder]);

  const handleDragSortToggle = () => {
    if (!isDragSortMode) {
      setDragOrderedRecipes([...filteredRecipes]);
    }
    setIsDragSortMode(!isDragSortMode);
  };

  const handleDragReorder = async (newOrder: RecipeWithIngredients[]) => {
    setDragOrderedRecipes(newOrder);
    
    // 保存排序到資料庫
    try {
      const orderUpdates = newOrder.map((recipe, index) => ({
        id: recipe.id,
        sortOrder: index,
      }));
      
      await apiRequest("POST", "/api/recipes/reorder", { orderUpdates });
      
      // 重新查詢資料以更新排序
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
    } catch (error) {
      toast({
        title: "排序保存失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    }
  };

  const displayRecipes = isDragSortMode ? dragOrderedRecipes : filteredRecipes;

  // 刪除配方
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "配方已刪除",
      });
    },
    onError: () => {
      toast({
        title: "刪除失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    },
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  // 操作處理器
  const handleEdit = (recipe: RecipeWithIngredients) => {
    setEditingRecipe(recipe);
    setShowModal(true);
  };

  const handleCopy = (recipe: RecipeWithIngredients) => {
    const { id, createdAt, updatedAt, ...recipeData } = recipe;
    const copiedRecipe = {
      ...recipeData,
      name: `${recipe.name} (複製)`,
      ingredients: recipe.ingredients.map(({ id, ...ing }) => ing),
    };
    setEditingRecipe(copiedRecipe as any);
    setShowModal(true);
  };

  const handleDelete = (recipe: RecipeWithIngredients) => {
    if (confirm(`確定要刪除配方「${recipe.name}」嗎？此操作無法恢復。`)) {
      deleteMutation.mutate(recipe.id);
    }
  };

  // Excel 匯入處理
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/recipes/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "匯入失敗");
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "匯入成功",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "匯入失敗",
        description: error instanceof Error ? error.message : "處理配方資料時發生錯誤",
        variant: "destructive",
      });
    }

    // 重置檔案輸入
    event.target.value = "";
  };

  // Excel 匯出處理 - 使用服務器端API確保格式一致
  const handleExport = async () => {
    try {
      const response = await fetch("/api/recipes/export");
      if (!response.ok) {
        throw new Error("匯出失敗");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recipes-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "匯出成功",
        description: `已匯出 ${filteredRecipes.length} 個配方`,
      });
    } catch (error) {
      toast({
        title: "匯出失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (categoryName: string): string => {
    const category = recipeCategories.find(cat => cat.name === categoryName);
    return category?.color || "#6B7280";
  };



  const averageCost = filteredRecipes.length > 0 
    ? filteredRecipes.reduce((sum: number, recipe: RecipeWithIngredients) => sum + (recipe.totalCost || 0), 0) / filteredRecipes.length
    : 0;

  const maxCostRecipe = filteredRecipes.reduce((max: RecipeWithIngredients | null, recipe: RecipeWithIngredients) => {
    if (!max || (recipe.totalCost || 0) > (max.totalCost || 0)) {
      return recipe;
    }
    return max;
  }, null);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-1 lg:mb-2">
            <span className="sm:hidden">配方</span>
            <span className="hidden sm:inline">產品配方管理</span>
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground">
            <span className="sm:hidden">管理配方與成本</span>
            <span className="hidden sm:inline">建立和管理烘焙產品配方，自動計算成本</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="import-recipes-file"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-recipes-file')?.click()}>
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
            apiEndpoint="/api/recipe-categories" 
            categoryLabel="配方"
          />
          <Button size="sm" onClick={() => {
            setEditingRecipe(null);
            setShowModal(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">新增配方</span>
            <span className="sm:hidden">新增</span>
          </Button>
        </div>
      </div>

      {/* 配方統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">配方總數</p>
                <p className="text-2xl font-bold text-foreground">{recipes.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <span className="text-orange-600 text-xl">📋</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">平均成本</p>
                <p className="text-2xl font-bold text-foreground">NT$ {averageCost.toFixed(0)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-yellow-600 text-xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">最高成本配方</p>
                <p className="text-lg font-bold text-foreground">
                  {maxCostRecipe?.name || "無"}
                </p>
                <p className="text-sm text-muted-foreground">
                  NT$ {maxCostRecipe?.totalCost?.toFixed(0) || "0"}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <span className="text-red-600 text-xl">📈</span>
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
                placeholder="搜尋配方名稱..."
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
                {recipeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
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
                <SelectItem value="0-50">NT$ 0 - 50</SelectItem>
                <SelectItem value="51-100">NT$ 51 - 100</SelectItem>
                <SelectItem value="101-200">NT$ 101 - 200</SelectItem>
                <SelectItem value="200+">NT$ 200+</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(""); setCategory(""); }}>
              清除篩選
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 配方表格 */}
      <Card>
        <CardHeader>
          <CardTitle>
            配方清單 (共 {displayRecipes.length} 個配方)
            {isDragSortMode && <span className="ml-2 text-primary text-sm">拖拽排序模式</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : displayRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || category !== "all" ? "無符合條件的配方" : "尚無配方資料，請新增第一個配方"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {isDragSortMode ? (
                  <DraggableList
                    items={displayRecipes}
                    onReorder={handleDragReorder}
                    keyExtractor={(recipe) => recipe.id.toString()}
                    renderItem={(recipe: RecipeWithIngredients) => (
                      <div className="flex items-center border-b hover:bg-muted/50 p-4">
                        <div className="flex-1 min-w-0 px-4">
                          <div className="font-medium">{recipe.name}</div>
                          {recipe.description && (
                            <div className="text-sm text-muted-foreground">{recipe.description}</div>
                          )}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4">
                          <Badge style={{ backgroundColor: getCategoryColor(recipe.category), color: 'white' }}>
                            {recipe.category}
                          </Badge>
                        </div>
                        <div className="w-16 flex-shrink-0 px-4 text-center">
                          {recipe.totalPortions || 0}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          {recipe.totalWeight || 0}g
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          NT$ {recipe.totalCost?.toFixed(0) || "0"}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          NT$ {recipe.costPerPortion?.toFixed(0) || "0"}
                        </div>
                        <div className="w-24 flex-shrink-0">
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(recipe)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(recipe)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(recipe)}>
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
                        <th className="text-left p-4">
                          <SortableHeader 
                            label="配方名稱" 
                            sortKey="name" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-4">
                          <SortableHeader 
                            label="分類" 
                            sortKey="category" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-4">
                          <SortableHeader 
                            label="總份量" 
                            sortKey="totalPortions" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-4">
                          <SortableHeader 
                            label="總重量(g)" 
                            sortKey="totalWeight" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-4">
                          <SortableHeader 
                            label="總成本" 
                            sortKey="totalCost" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-4">
                          <SortableHeader 
                            label="每份成本" 
                            sortKey="costPerPortion" 
                            currentSort={sortBy} 
                            currentOrder={sortOrder} 
                            onSort={handleSort} 
                          />
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                    {displayRecipes.map((recipe: RecipeWithIngredients) => (
                      <tr key={recipe.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{recipe.name}</div>
                          {recipe.description && (
                            <div className="text-sm text-muted-foreground">{recipe.description}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge style={{ backgroundColor: getCategoryColor(recipe.category), color: 'white' }}>
                            {recipe.category}
                          </Badge>
                        </td>
                        <td className="p-4">{recipe.totalPortions || 0}</td>
                        <td className="p-4">{formatNumber(parseFloat((recipe.totalWeight || 0).toString()))}</td>
                        <td className="p-4 font-medium">
                          NT$ {formatNumber(recipe.totalCost || 0)}
                        </td>
                        <td className="p-4 font-medium text-green-600">
                          NT$ {formatNumber(recipe.costPerPortion || 0)}
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="編輯配方"
                              onClick={() => handleEdit(recipe)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="複製配方"
                              onClick={() => handleCopy(recipe)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="刪除配方"
                              onClick={() => handleDelete(recipe)}
                              disabled={deleteMutation.isPending}
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
            </>
          )}
        </CardContent>
      </Card>

      <RecipeModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            setEditingRecipe(null);
          }
        }}
        recipe={editingRecipe}
      />
    </div>
  );
}
