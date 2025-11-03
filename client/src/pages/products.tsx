import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Upload, Download, Plus, Edit, Trash2, TrendingUp, Copy, ArrowUpDown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { readExcelFile, exportToExcel } from "@/lib/excel-utils";
import { useToast } from "@/hooks/use-toast";
import { SortableHeader } from "@/components/ui/sortable-header";
import { DraggableList } from "@/components/ui/draggable-list";
import { CategoryManagement } from "@/components/category-management";
import ProductModal from "@/components/modals/product-modal";

import type { ProductWithDetails } from "@shared/schema";

export default function Products() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDragSortMode, setIsDragSortMode] = useState(false);
  const [dragOrderedProducts, setDragOrderedProducts] = useState<ProductWithDetails[]>([]);


  const { data: products = [], isLoading } = useQuery<ProductWithDetails[]>({
    queryKey: ["/api/products"],
  });

  const { data: productCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number; color?: string }[]>({
    queryKey: ["/api/product-categories"],
  });

  const initCategoriesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/product-categories/init"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
  });

  useEffect(() => {
    if (products.length > 0 && productCategories.length === 0) {
      initCategoriesMutation.mutate();
    }
  }, [products.length, productCategories.length]);

  // 取得利潤率設定
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product: ProductWithDetails) => {
      const matchesSearch = !search || 
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
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
          case "sellingPrice":
            aValue = parseFloat(a.sellingPrice);
            bValue = parseFloat(b.sellingPrice);
            break;
          case "totalCost":
            aValue = a.totalCost || 0;
            bValue = b.totalCost || 0;
            break;
          case "managementFeePercentage":
            aValue = parseFloat(a.managementFeePercentage);
            bValue = parseFloat(b.managementFeePercentage);
            break;
          case "adjustedCost":
            aValue = a.adjustedCost || 0;
            bValue = b.adjustedCost || 0;
            break;
          case "profit":
            aValue = a.profit || 0;
            bValue = b.profit || 0;
            break;
          case "profitMargin":
            aValue = a.profitMargin || 0;
            bValue = b.profitMargin || 0;
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
  }, [products, search, category, sortBy, sortOrder]);

  const handleDragSortToggle = () => {
    if (!isDragSortMode) {
      setDragOrderedProducts([...filteredProducts]);
    }
    setIsDragSortMode(!isDragSortMode);
  };

  const handleDragReorder = async (newOrder: ProductWithDetails[]) => {
    setDragOrderedProducts(newOrder);
    
    // 保存排序到資料庫
    try {
      const orderUpdates = newOrder.map((product, index) => ({
        id: product.id,
        sortOrder: index,
      }));
      
      await apiRequest("POST", "/api/products/reorder", { orderUpdates });
      
      // 重新查詢資料以更新排序
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      toast({
        title: "排序保存失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    }
  };

  const displayProducts = isDragSortMode ? dragOrderedProducts : filteredProducts;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "商品已刪除" });
    },
    onError: () => {
      toast({ title: "刪除失敗", variant: "destructive" });
    },
  });



  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/products/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedItems([]);
      toast({ title: "批次刪除完成" });
    },
    onError: () => {
      toast({ title: "批次刪除失敗", variant: "destructive" });
    },
  });



  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    if (confirm(`確定要刪除選中的 ${selectedItems.length} 個商品嗎？`)) {
      bulkDeleteMutation.mutate(selectedItems);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(products.map((p: ProductWithDetails) => p.id));
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

  const getCategoryColor = (categoryName: string): string => {
    const category = productCategories.find(cat => cat.name === categoryName);
    return category?.color || "#6B7280";
  };

  const getMarginBadgeColor = (margin: number) => {
    const lowThreshold = settings?.profitMargin?.lowThreshold || 20;
    const highThreshold = settings?.profitMargin?.highThreshold || 40;
    
    if (margin >= highThreshold) return "bg-green-100 text-green-800";
    if (margin >= lowThreshold) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Excel 匯入處理 - 使用服務器端API確保格式一致
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "匯入失敗");
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "匯入成功",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "匯入失敗",
        description: error instanceof Error ? error.message : "處理商品資料時發生錯誤",
        variant: "destructive",
      });
    }

    // 重置檔案輸入
    event.target.value = "";
  };

  // Excel 匯出處理 - 使用服務器端API確保格式一致
  const handleExport = async () => {
    try {
      const response = await fetch("/api/products/export");
      if (!response.ok) {
        throw new Error("匯出失敗");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "匯出成功",
        description: `已匯出 ${filteredProducts.length} 個商品`,
      });
    } catch (error) {
      toast({
        title: "匯出失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    }
  };



  // 計算統計數據
  const averagePrice = filteredProducts.length > 0 
    ? filteredProducts.reduce((sum: number, product: ProductWithDetails) => sum + parseFloat(product.sellingPrice), 0) / filteredProducts.length
    : 0;

  const averageMargin = filteredProducts.length > 0 
    ? filteredProducts.reduce((sum: number, product: ProductWithDetails) => sum + (product.profitMargin || 0), 0) / filteredProducts.length
    : 0;

  const topProduct = filteredProducts.reduce((max: ProductWithDetails | null, product: ProductWithDetails) => {
    if (!max || (product.profitMargin || 0) > (max.profitMargin || 0)) {
      return product;
    }
    return max;
  }, null);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            <span className="sm:hidden">商品</span>
            <span className="hidden sm:inline">販售商品管理</span>
          </h2>
          <p className="text-muted-foreground">
            <span className="sm:hidden">管理商品利潤定價</span>
            <span className="hidden sm:inline">管理最終販售的商品，計算利潤與定價</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="import-products-file"
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => document.getElementById('import-products-file')?.click()}>
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
          <CategoryManagement 
            apiEndpoint="/api/product-categories" 
            categoryLabel="商品"
          />
          <Button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">新增商品</span>
            <span className="sm:hidden">新增</span>
          </Button>
        </div>
      </div>

      {/* 商品統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">商品總數</p>
                <p className="text-2xl font-bold text-foreground">{products.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-green-600 text-xl">🎂</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">平均售價</p>
                <p className="text-2xl font-bold text-foreground">NT$ {averagePrice.toFixed(0)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-yellow-600 text-xl">🏷️</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">平均利潤率</p>
                <p className="text-2xl font-bold text-green-600">{averageMargin.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="text-blue-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">最高利潤商品</p>
                <p className="text-lg font-bold text-foreground">
                  {topProduct?.name ? (topProduct.name.length > 10 ? topProduct.name.substring(0, 10) + "..." : topProduct.name) : "無"}
                </p>
                <p className="text-sm text-green-600">{topProduct?.profitMargin?.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <span className="text-red-600 text-xl">👑</span>
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
                placeholder="搜尋商品名稱..."
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
                {productCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="價格範圍" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="0-100">NT$ 0 - 100</SelectItem>
                <SelectItem value="101-300">NT$ 101 - 300</SelectItem>
                <SelectItem value="301-500">NT$ 301 - 500</SelectItem>
                <SelectItem value="500+">NT$ 500+</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => { setSearch(""); setCategory(""); }}
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
      
      {/* 商品表格 */}
      <Card>
        <CardHeader>
          <CardTitle>
            商品清單 (共 {displayProducts.length} 項商品)
            {isDragSortMode && <span className="ml-2 text-primary text-sm">拖拽排序模式</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無商品資料，請新增第一個商品
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {isDragSortMode ? (
                  <DraggableList
                    items={displayProducts}
                    onReorder={handleDragReorder}
                    keyExtractor={(product) => product.id.toString()}
                    renderItem={(product: ProductWithDetails) => (
                      <div className="flex items-center border-b hover:bg-muted/50 p-4">
                        <div className="w-8 flex-shrink-0">
                          <Checkbox
                            checked={selectedItems.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectItem(product.id, !!checked)}
                          />
                        </div>
                        <div className="flex-1 min-w-0 px-4">
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground">{product.description}</div>
                          )}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4">
                          <Badge style={{ backgroundColor: getCategoryColor(product.category), color: 'white' }}>
                            {product.category}
                          </Badge>
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          NT$ {parseFloat(product.sellingPrice).toFixed(0)}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          NT$ {product.totalCost?.toFixed(0) || "0"}
                        </div>
                        <div className="w-16 flex-shrink-0 px-4 text-center">
                          {parseFloat(product.managementFeePercentage).toFixed(1)}%
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          NT$ {product.adjustedCost?.toFixed(0) || "0"}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          NT$ {product.profit?.toFixed(0) || "0"}
                        </div>
                        <div className="w-20 flex-shrink-0 px-4 text-center">
                          <Badge className={getMarginBadgeColor(product.profitMargin || 0)}>
                            {product.profitMargin?.toFixed(1) || "0"}%
                          </Badge>
                        </div>
                        <div className="w-24 flex-shrink-0">
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(product); setShowModal(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { 
                              const { id, createdAt, updatedAt, ...productData } = product;
                              const copiedProduct = {
                                ...productData,
                                name: `${product.name} (複製)`,
                                recipes: product.recipes?.map(({ id, ...recipe }) => recipe) || [],
                                packaging: product.packaging?.map(({ id, ...pkg }) => pkg) || [],
                              };
                              setEditingProduct(copiedProduct as any);
                              setShowModal(true);
                            }}>
                              <Copy className="h-4 w-4" />
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
                        <th className="text-left p-4 font-medium text-muted-foreground">
                          <Checkbox
                            checked={selectedItems.length === displayProducts.length && displayProducts.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left p-4">
                          <SortableHeader 
                          label="商品名稱" 
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
                          label="售價" 
                          sortKey="sellingPrice" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort} 
                        />
                      </th>
                      <th className="text-left p-4">
                        <SortableHeader 
                          label="原成本" 
                          sortKey="totalCost" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort} 
                        />
                      </th>
                      <th className="text-left p-4">
                        <SortableHeader 
                          label="管理費%" 
                          sortKey="managementFeePercentage" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort} 
                        />
                      </th>
                      <th className="text-left p-4">
                        <SortableHeader 
                          label="攤提後成本" 
                          sortKey="adjustedCost" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort} 
                        />
                      </th>
                      <th className="text-left p-4">
                        <SortableHeader 
                          label="利潤" 
                          sortKey="profit" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort} 
                        />
                      </th>
                      <th className="text-left p-4">
                        <SortableHeader 
                          label="利潤率" 
                          sortKey="profitMargin" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort} 
                        />
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProducts.map((product: ProductWithDetails) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedItems.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectItem(product.id, !!checked)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground">{product.description}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge style={{ backgroundColor: getCategoryColor(product.category), color: 'white' }}>
                            {product.category}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium">
                          NT$ {parseFloat(product.sellingPrice).toFixed(0)}
                        </td>
                        <td className="p-4">
                          NT$ {product.totalCost?.toFixed(0) || "0"}
                        </td>
                        <td className="p-4">
                          {parseFloat(product.managementFeePercentage).toFixed(1)}%
                        </td>
                        <td className="p-4 font-medium">
                          NT$ {product.adjustedCost?.toFixed(0) || "0"}
                        </td>
                        <td className="p-4 font-medium text-green-600">
                          NT$ {product.profit?.toFixed(0) || "0"}
                        </td>
                        <td className="p-4">
                          <Badge className={getMarginBadgeColor(product.profitMargin || 0)}>
                            {product.profitMargin?.toFixed(1) || "0"}%
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setShowModal(true);
                              }}
                              title="編輯商品"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="複製商品"
                              onClick={() => {
                                const { id, createdAt, updatedAt, ...productData } = product;
                                const copiedProduct = {
                                  ...productData,
                                  name: `${product.name} (複製)`,
                                  recipes: product.recipes?.map(({ id, ...recipe }) => recipe) || [],
                                  packaging: product.packaging?.map(({ id, ...pkg }) => pkg) || [],
                                };
                                setEditingProduct(copiedProduct as any);
                                setShowModal(true);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`確定要刪除商品「${product.name}」嗎？此操作無法恢復。`)) {
                                  deleteMutation.mutate(product.id);
                                }
                              }}
                              title="刪除商品"
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

      <ProductModal
        open={showModal}
        onOpenChange={setShowModal}
        product={editingProduct}
      />
    </div>
  );
}
