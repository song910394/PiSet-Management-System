import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

interface Recipe {
  id: number;
  name: string;
  category: string;
  totalWeight: number;
  totalPortions: number;
}

interface NutritionLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
}

export function NutritionLabelModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: NutritionLabelModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    recipeIds: [] as string[],
    servingSize: "",
    servingsPerPackage: "",
    templateId: null,
    calculatedNutrition: null as any,
    generatedFiles: null,
  });

  const [recipeSearch, setRecipeSearch] = useState("");

  const { data: recipes = [] } = useQuery({
    queryKey: ["/api/recipes"],
    queryFn: () => apiRequest("/api/recipes"),
  });

  // 過濾配方
  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes;
    return recipes.filter((recipe: Recipe) => 
      recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
      recipe.category.toLowerCase().includes(recipeSearch.toLowerCase())
    );
  }, [recipes, recipeSearch]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        recipeIds: initialData.recipeIds || [],
        servingSize: initialData.servingSize?.toString() || "",
        servingsPerPackage: initialData.servingsPerPackage?.toString() || "",
        templateId: initialData.templateId || null,
        calculatedNutrition: initialData.calculatedNutrition || null,
        generatedFiles: initialData.generatedFiles || null,
      });
    } else {
      setFormData({
        name: "",
        recipeIds: [],
        servingSize: "",
        servingsPerPackage: "",
        templateId: null,
        calculatedNutrition: null,
        generatedFiles: null,
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("請輸入營養標示名稱");
      return;
    }
    
    if (formData.recipeIds.length === 0) {
      alert("請選擇至少一個配方");
      return;
    }
    
    if (!formData.servingSize || parseFloat(formData.servingSize) <= 0) {
      alert("請輸入正確的每份重量");
      return;
    }
    
    if (!formData.servingsPerPackage || parseInt(formData.servingsPerPackage) <= 0) {
      alert("請輸入正確的包裝份數");
      return;
    }

    const submitData = {
      ...formData,
      servingSize: parseFloat(formData.servingSize),
      servingsPerPackage: parseInt(formData.servingsPerPackage),
    };

    onSubmit(submitData);
  };

  const handleRecipeToggle = (recipeId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      recipeIds: checked
        ? [...prev.recipeIds, recipeId]
        : prev.recipeIds.filter(id => id !== recipeId)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "編輯營養標示" : "新增營養標示"}
          </DialogTitle>
          <DialogDescription>
            {initialData ? "修改營養標示的配方組合和每份重量設定" : "建立新的產品營養標示，包含配方組合和包裝資訊"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">營養標示名稱 *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="輸入營養標示名稱"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servingSize">每份重量 (g) *</Label>
              <Input
                id="servingSize"
                type="number"
                step="0.1"
                min="0"
                value={formData.servingSize}
                onChange={(e) => setFormData(prev => ({ ...prev, servingSize: e.target.value }))}
                placeholder="輸入每份重量"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servingsPerPackage">每包裝份數 *</Label>
              <Input
                id="servingsPerPackage"
                type="number"
                min="1"
                value={formData.servingsPerPackage}
                onChange={(e) => setFormData(prev => ({ ...prev, servingsPerPackage: e.target.value }))}
                placeholder="輸入每包裝份數"
                required
              />
            </div>
          </div>

          {/* 配方選擇 */}
          <div className="space-y-3">
            <Label>選擇配方 *</Label>
            <Input
              placeholder="搜尋配方..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              className="mb-2"
            />
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              {filteredRecipes.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  {recipeSearch ? "找不到符合條件的配方" : "沒有可用的配方"}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRecipes.map((recipe: Recipe) => (
                    <div key={recipe.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`recipe-${recipe.id}`}
                        checked={formData.recipeIds.includes(recipe.id.toString())}
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
                  ))}
                </div>
              )}
            </div>
            {formData.recipeIds.length > 0 && (
              <div className="text-sm text-gray-600">
                已選擇 {formData.recipeIds.length} 個配方
              </div>
            )}
          </div>

          {/* 顯示營養成分（如果有計算過的話） */}
          {formData.calculatedNutrition && (
            <div className="space-y-3">
              <Label>計算的營養成分</Label>
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">每份營養成分</h4>
                    <div className="space-y-1 text-sm">
                      <div>熱量：{Math.round(formData.calculatedNutrition.perServing?.calories || 0)} kcal</div>
                      <div>蛋白質：{Math.round(formData.calculatedNutrition.perServing?.protein || 0)} g</div>
                      <div>脂肪：{Math.round(formData.calculatedNutrition.perServing?.fat || 0)} g</div>
                      <div>飽和脂肪：{Math.round(formData.calculatedNutrition.perServing?.saturatedFat || 0)} g</div>
                      <div>反式脂肪：{Math.round(formData.calculatedNutrition.perServing?.transFat || 0)} g</div>
                      <div>碳水化合物：{Math.round(formData.calculatedNutrition.perServing?.carbohydrates || 0)} g</div>
                      <div>糖：{Math.round(formData.calculatedNutrition.perServing?.sugar || 0)} g</div>
                      <div>鈉：{Math.round(formData.calculatedNutrition.perServing?.sodium || 0)} mg</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">每100g營養成分</h4>
                    <div className="space-y-1 text-sm">
                      <div>熱量：{Math.round(formData.calculatedNutrition.per100g?.calories || 0)} kcal</div>
                      <div>蛋白質：{Math.round(formData.calculatedNutrition.per100g?.protein || 0)} g</div>
                      <div>脂肪：{Math.round(formData.calculatedNutrition.per100g?.fat || 0)} g</div>
                      <div>飽和脂肪：{Math.round(formData.calculatedNutrition.per100g?.saturatedFat || 0)} g</div>
                      <div>反式脂肪：{Math.round(formData.calculatedNutrition.per100g?.transFat || 0)} g</div>
                      <div>碳水化合物：{Math.round(formData.calculatedNutrition.per100g?.carbohydrates || 0)} g</div>
                      <div>糖：{Math.round(formData.calculatedNutrition.per100g?.sugar || 0)} g</div>
                      <div>鈉：{Math.round(formData.calculatedNutrition.per100g?.sodium || 0)} mg</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "處理中..." : initialData ? "更新" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}