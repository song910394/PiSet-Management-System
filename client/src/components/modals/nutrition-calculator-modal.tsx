import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Calculator } from "lucide-react";

interface Recipe {
  id: number;
  name: string;
  category: string;
  totalWeight: number;
  totalPortions: number;
}

interface NutritionCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NutritionCalculatorModal({
  isOpen,
  onClose,
}: NutritionCalculatorModalProps) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [servingSize, setServingSize] = useState("");
  const [servingsPerPackage, setServingsPerPackage] = useState("");
  const [calculatedNutrition, setCalculatedNutrition] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");

  const { data: recipes = [] } = useQuery({
    queryKey: ["/api/recipes"],
    queryFn: () => apiRequest("/api/recipes"),
    enabled: isOpen,
  });

  // 過濾配方
  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    if (!recipeSearch.trim()) return true;
    return (
      recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
      recipe.category.toLowerCase().includes(recipeSearch.toLowerCase())
    );
  });

  const handleCalculate = async () => {
    if (selectedRecipeIds.length === 0) {
      alert("請選擇至少一個配方");
      return;
    }

    if (!servingSize || parseFloat(servingSize) <= 0) {
      alert("請輸入正確的每份重量");
      return;
    }

    if (!servingsPerPackage || parseInt(servingsPerPackage) <= 0) {
      alert("請輸入正確的包裝份數");
      return;
    }

    setCalculating(true);
    try {
      const result = await apiRequest("/api/nutrition-labels/calculate", {
        method: "POST",
        body: {
          recipeIds: selectedRecipeIds,
          servingSize: parseFloat(servingSize),
          servingsPerPackage: parseInt(servingsPerPackage),
        },
      });

      setCalculatedNutrition(result);
    } catch (error) {
      console.error("Calculation error:", error);
      alert("營養成分計算失敗");
    } finally {
      setCalculating(false);
    }
  };

  const handleRecipeToggle = (recipeId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipeIds(prev => [...prev, recipeId]);
    } else {
      setSelectedRecipeIds(prev => prev.filter(id => id !== recipeId));
    }
  };

  const reset = () => {
    setSelectedRecipeIds([]);
    setServingSize("");
    setServingsPerPackage("");
    setCalculatedNutrition(null);
    setRecipeSearch("");
  };

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            營養成分計算器
          </DialogTitle>
          <DialogDescription>
            選擇配方並設定份量來計算產品的營養成分資訊
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：配方選擇和計算參數 */}
          <div className="space-y-6">
            {/* 計算參數 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">計算參數</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serving-size">每份重量 (g)</Label>
                    <Input
                      id="serving-size"
                      type="number"
                      step="0.1"
                      min="0"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="例如：100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servings-per-package">每包裝份數</Label>
                    <Input
                      id="servings-per-package"
                      type="number"
                      min="1"
                      value={servingsPerPackage}
                      onChange={(e) => setServingsPerPackage(e.target.value)}
                      placeholder="例如：2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 配方選擇 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">選擇配方</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="搜尋配方..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto border rounded p-4 space-y-3">
                  {filteredRecipes.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                      {recipeSearch ? "找不到符合條件的配方" : "沒有可用的配方"}
                    </div>
                  ) : (
                    filteredRecipes.map((recipe: Recipe) => (
                      <div key={recipe.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`recipe-${recipe.id}`}
                          checked={selectedRecipeIds.includes(recipe.id.toString())}
                          onCheckedChange={(checked) =>
                            handleRecipeToggle(recipe.id.toString(), checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`recipe-${recipe.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                        >
                          <div>
                            <div className="font-medium">{recipe.name}</div>
                            <div className="text-xs text-gray-500">
                              {recipe.category} • {recipe.totalWeight}g • {recipe.totalPortions}份
                            </div>
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {selectedRecipeIds.length > 0 && (
                  <div className="text-sm text-gray-600">
                    已選擇 {selectedRecipeIds.length} 個配方
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 計算按鈕 */}
            <div className="flex gap-2">
              <Button 
                onClick={handleCalculate} 
                disabled={calculating || selectedRecipeIds.length === 0}
                className="flex-1"
              >
                {calculating ? "計算中..." : "計算營養成分"}
              </Button>
              <Button variant="outline" onClick={reset}>
                重設
              </Button>
            </div>
          </div>

          {/* 右側：計算結果 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">計算結果</CardTitle>
              </CardHeader>
              <CardContent>
                {!calculatedNutrition ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <div>選擇配方並設定參數後，點擊計算按鈕</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 每份營養成分 */}
                    <div>
                      <h4 className="font-medium mb-3 text-green-600">每份營養成分 ({servingSize}g)</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>熱量：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.calories || 0)} kcal</span>
                          </div>
                          <div className="flex justify-between">
                            <span>蛋白質：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.protein || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>脂肪：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.fat || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>飽和脂肪：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.saturatedFat || 0)} g</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>反式脂肪：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.transFat || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>碳水化合物：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.carbohydrates || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>糖：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.sugar || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>鈉：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.perServing?.sodium || 0)} mg</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 每100g營養成分 */}
                    <div>
                      <h4 className="font-medium mb-3 text-blue-600">每100g營養成分</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>熱量：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.calories || 0)} kcal</span>
                          </div>
                          <div className="flex justify-between">
                            <span>蛋白質：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.protein || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>脂肪：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.fat || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>飽和脂肪：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.saturatedFat || 0)} g</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>反式脂肪：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.transFat || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>碳水化合物：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.carbohydrates || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>糖：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.sugar || 0)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>鈉：</span>
                            <span className="font-medium">{Math.round(calculatedNutrition.per100g?.sodium || 0)} mg</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 總重量和份數 */}
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span>總重量：</span>
                          <span className="font-medium">{calculatedNutrition.totalWeight}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>包裝份數：</span>
                          <span className="font-medium">{calculatedNutrition.servingsPerPackage}份</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}