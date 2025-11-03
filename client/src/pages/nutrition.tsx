import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Download, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { readExcelFile, exportToExcel } from "@/lib/excel-utils";
import { useToast } from "@/hooks/use-toast";
import NutritionModal from "@/components/modals/nutrition-modal";

import type { MaterialWithNutrition } from "@shared/schema";

export default function Nutrition() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [completeness, setCompleteness] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingNutrition, setEditingNutrition] = useState<MaterialWithNutrition | null>(null);


  const { data: nutritionData = [], isLoading } = useQuery({
    queryKey: ["/api/nutrition", { search, category }],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/nutrition/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition"] });
      toast({ title: "營養成分已刪除" });
    },
    onError: () => {
      toast({ title: "刪除失敗", variant: "destructive" });
    },
  });

  const handleEdit = (item: MaterialWithNutrition) => {
    setEditingNutrition(item);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個營養成分資料嗎？")) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      "麵粉類": "bg-blue-100 text-blue-800",
      "乳製品": "bg-yellow-100 text-yellow-800", 
      "糖類": "bg-green-100 text-green-800",
      "蛋類": "bg-orange-100 text-orange-800",
      "添加劑": "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (hasNutrition: boolean) => {
    if (hasNutrition) {
      return <Badge className="bg-green-100 text-green-800">完整</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">缺少資料</Badge>;
    }
  };

  // Excel 匯入處理 - 使用服務器端API支援原料名稱匹配
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/nutrition/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "匯入失敗");
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition"] });
      toast({
        title: "匯入成功",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "匯入失敗",
        description: error instanceof Error ? error.message : "處理營養成分資料時發生錯誤",
        variant: "destructive",
      });
    }

    // 重置檔案輸入
    event.target.value = "";
  };

  // Excel 匯出處理 - 使用新API匯出所有原料，包括缺少資料的
  const handleExport = async () => {
    try {
      const response = await fetch("/api/nutrition-facts/export");
      if (!response.ok) {
        throw new Error("匯出失敗");
      }
      
      // 下載檔案
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nutrition-facts.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "匯出成功",
        description: "已匯出所有原料營養成分（缺少資料的已補0）",
      });
    } catch (error) {
      toast({
        title: "匯出失敗",
        description: "匯出營養成分資料時發生錯誤",
        variant: "destructive",
      });
    }
  };

  // 篩選資料
  const filteredData = nutritionData.filter((item: MaterialWithNutrition) => {
    if (completeness === "complete" && !item.nutritionFacts) return false;
    if (completeness === "missing" && item.nutritionFacts) return false;
    return true;
  });



  // 計算統計數據
  const totalWithNutrition = nutritionData.filter((item: MaterialWithNutrition) => item.nutritionFacts).length;
  const completenessPercentage = nutritionData.length > 0 ? (totalWithNutrition / nutritionData.length) * 100 : 0;
  const pendingCount = nutritionData.length - totalWithNutrition;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-foreground mb-2">營養成分管理</h2>
          <p className="text-muted-foreground">管理原料的營養成分資訊</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="import-nutrition-file"
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => document.getElementById('import-nutrition-file')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            批次匯入
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            批次匯出
          </Button>
          <Button onClick={() => { setEditingNutrition(null); setShowModal(true); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            新增營養成分
          </Button>
        </div>
      </div>

      {/* 營養成分統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">已建檔原料數</p>
                <p className="text-2xl font-bold text-foreground">{totalWithNutrition}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-green-600 text-xl">🍎</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">完整度</p>
                <p className="text-2xl font-bold text-foreground">{completenessPercentage.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">待補齊資料</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="text-yellow-600 h-6 w-6" />
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
                <SelectItem value="麵粉類">麵粉類</SelectItem>
                <SelectItem value="乳製品">乳製品</SelectItem>
                <SelectItem value="糖類">糖類</SelectItem>
                <SelectItem value="蛋類">蛋類</SelectItem>
                <SelectItem value="添加劑">添加劑</SelectItem>
              </SelectContent>
            </Select>
            <Select value={completeness} onValueChange={setCompleteness}>
              <SelectTrigger>
                <SelectValue placeholder="資料完整度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="complete">資料完整</SelectItem>
                <SelectItem value="missing">缺少資料</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(""); setCategory(""); setCompleteness(""); }}>
              清除篩選
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 營養成分表格 */}
      <Card>
        <CardHeader>
          <CardTitle>營養成分清單 (共 {filteredData.length} 項原料營養資料)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              沒有符合條件的營養成分資料
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">原料名稱</th>
                      <th className="text-center p-3">熱量<br/>(kcal/100g)</th>
                      <th className="text-center p-3">蛋白質<br/>(g/100g)</th>
                      <th className="text-center p-3">脂肪<br/>(g/100g)</th>
                      <th className="text-center p-3">飽和脂肪<br/>(g/100g)</th>
                      <th className="text-center p-3">碳水化合物<br/>(g/100g)</th>
                      <th className="text-center p-3">糖<br/>(g/100g)</th>
                      <th className="text-center p-3">鈉<br/>(mg/100g)</th>
                      <th className="text-left p-3">狀態</th>
                      <th className="text-left p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item: MaterialWithNutrition) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="font-medium">{item.name}</div>
                          <Badge className={getCategoryBadgeColor(item.category)} size="sm">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.calories ? parseFloat(item.nutritionFacts.calories).toFixed(0) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.protein ? parseFloat(item.nutritionFacts.protein).toFixed(1) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.fat ? parseFloat(item.nutritionFacts.fat).toFixed(1) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.saturatedFat ? parseFloat(item.nutritionFacts.saturatedFat).toFixed(1) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.carbohydrates ? parseFloat(item.nutritionFacts.carbohydrates).toFixed(1) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.sugar ? parseFloat(item.nutritionFacts.sugar).toFixed(1) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {item.nutritionFacts?.sodium ? parseFloat(item.nutritionFacts.sodium).toFixed(0) : "-"}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(!!item.nutritionFacts)}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              title="編輯營養成分"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {item.nutritionFacts && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.nutritionFacts!.id)}
                                title="刪除營養成分"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              

            </>
          )}
        </CardContent>
      </Card>

      <NutritionModal
        open={showModal}
        onOpenChange={setShowModal}
        material={editingNutrition}
      />
    </div>
  );
}
