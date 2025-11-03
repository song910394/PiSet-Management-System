import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { exportToExcel } from "@/lib/excel-utils";
import { Search, RefreshCw, Download, Eye, Calculator, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import type { RecipeNutrition } from "@shared/schema";

export default function NutritionTables() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");


  const { data: nutritionTables = [], isLoading } = useQuery<RecipeNutrition[]>({
    queryKey: ["/api/nutrition/recipes"],
  });

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      "蛋糕": "bg-orange-100 text-orange-800",
      "麵包": "bg-blue-100 text-blue-800", 
      "餅乾": "bg-green-100 text-green-800",
      "塔派": "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  // 模擬狀態篩選 (實際應該在後端處理)
  const filteredData = nutritionTables.filter((item: RecipeNutrition) => {
    const matchesSearch = !search || item.recipeName.toLowerCase().includes(search.toLowerCase());
    // 這裡可以根據實際需求添加更多篩選邏輯
    return matchesSearch;
  });



  // 計算統計數據
  const calculatedCount = nutritionTables.length;
  const pendingCount = 0; // 這裡應該從 API 獲取
  const completenessPercentage = 100; // 這裡應該計算實際完整度

  // Excel 匯出處理
  const handleExport = () => {
    const exportData = filteredData.map(item => ({
      "配方名稱": item.recipeName,
      "份量重量(g)": item.portionWeight,
      "熱量(kcal/份)": item.calories.toFixed(2),
      "蛋白質(g/份)": item.protein.toFixed(2),
      "脂肪(g/份)": item.fat.toFixed(2),
      "飽和脂肪(g/份)": item.saturatedFat.toFixed(2),
      "反式脂肪(g/份)": item.transFat.toFixed(2),
      "碳水化合物(g/份)": item.carbohydrates.toFixed(2),
      "糖(g/份)": item.sugar.toFixed(2),
      "鈉(mg/份)": item.sodium.toFixed(2),
    }));

    exportToExcel(exportData, "產品營養成分表", "營養成分表");
    toast({
      title: "匯出成功",
      description: `已匯出 ${filteredData.length} 個產品營養成分表`,
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-foreground mb-2">產品配方營養成分表</h2>
          <p className="text-muted-foreground">自動計算產品配方的營養成分資訊</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            重新計算
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            批次匯出
          </Button>
        </div>
      </div>

      {/* 營養成分表統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">已計算產品</p>
                <p className="text-2xl font-bold text-foreground">{calculatedCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="text-green-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">待計算產品</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="text-yellow-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">計算完整度</p>
                <p className="text-2xl font-bold text-blue-600">{completenessPercentage}%</p>
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
                <p className="text-muted-foreground text-sm mb-1">最後更新</p>
                <p className="text-lg font-bold text-foreground">今天 14:32</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="text-orange-600 h-6 w-6" />
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
                placeholder="搜尋產品名稱..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="產品分類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分類</SelectItem>
                <SelectItem value="蛋糕">蛋糕</SelectItem>
                <SelectItem value="麵包">麵包</SelectItem>
                <SelectItem value="餅乾">餅乾</SelectItem>
                <SelectItem value="塔派">塔派</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="計算狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="calculated">已計算</SelectItem>
                <SelectItem value="pending">待計算</SelectItem>
                <SelectItem value="incomplete">資料不完整</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(""); setCategory(""); setStatus("all"); }}>
              清除篩選
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 產品營養成分表格 */}
      <Card>
        <CardHeader>
          <CardTitle>產品營養成分清單 (共 {filteredData.length} 項產品)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              沒有符合條件的產品營養成分資料
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">產品名稱</th>
                      <th className="text-center p-3">每份重量<br/>(g)</th>
                      <th className="text-center p-3">熱量<br/>(kcal/份)</th>
                      <th className="text-center p-3">蛋白質<br/>(g/份)</th>
                      <th className="text-center p-3">脂肪<br/>(g/份)</th>
                      <th className="text-center p-3">飽和脂肪<br/>(g/份)</th>
                      <th className="text-center p-3">碳水化合物<br/>(g/份)</th>
                      <th className="text-center p-3">糖<br/>(g/份)</th>
                      <th className="text-center p-3">鈉<br/>(mg/份)</th>
                      <th className="text-left p-3">狀態</th>
                      <th className="text-left p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item: RecipeNutrition) => (
                      <tr key={item.recipeId} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="font-medium">{item.recipeName}</div>
                          <div className="text-muted-foreground text-xs">配方類別</div>
                        </td>
                        <td className="p-3 text-center">{item.portionWeight.toFixed(0)}</td>
                        <td className="p-3 text-center font-medium">{item.calories.toFixed(0)}</td>
                        <td className="p-3 text-center">{item.protein.toFixed(1)}</td>
                        <td className="p-3 text-center">{item.fat.toFixed(1)}</td>
                        <td className="p-3 text-center">{item.saturatedFat.toFixed(1)}</td>
                        <td className="p-3 text-center">{item.carbohydrates.toFixed(1)}</td>
                        <td className="p-3 text-center">{item.sugar.toFixed(1)}</td>
                        <td className="p-3 text-center">{item.sodium.toFixed(0)}</td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">已計算</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" title="查看詳細">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="重新計算">
                              <Calculator className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="匯出標籤">
                              <Download className="h-4 w-4" />
                            </Button>
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
    </div>
  );
}
