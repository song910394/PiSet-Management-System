import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MaterialWithNutrition, InsertNutritionFacts } from "@shared/schema";

interface NutritionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: MaterialWithNutrition | null;
}

export default function NutritionModal({ open, onOpenChange, material }: NutritionModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertNutritionFacts>({
    materialId: 0,
    calories: "",
    protein: "",
    fat: "",
    saturatedFat: "",
    transFat: "",
    carbohydrates: "",
    sugar: "",
    sodium: "",
  });

  useEffect(() => {
    if (material) {
      setFormData({
        materialId: material.id,
        calories: material.nutritionFacts?.calories || "",
        protein: material.nutritionFacts?.protein || "",
        fat: material.nutritionFacts?.fat || "",
        saturatedFat: material.nutritionFacts?.saturatedFat || "",
        transFat: material.nutritionFacts?.transFat || "",
        carbohydrates: material.nutritionFacts?.carbohydrates || "",
        sugar: material.nutritionFacts?.sugar || "",
        sodium: material.nutritionFacts?.sodium || "",
      });
    } else {
      setFormData({
        materialId: 0,
        calories: "",
        protein: "",
        fat: "",
        saturatedFat: "",
        transFat: "",
        carbohydrates: "",
        sugar: "",
        sodium: "",
      });
    }
  }, [material, open]);

  const mutation = useMutation({
    mutationFn: (data: InsertNutritionFacts) => {
      if (material?.nutritionFacts) {
        return apiRequest("PUT", `/api/nutrition/${material.nutritionFacts.id}`, data);
      } else {
        return apiRequest("POST", "/api/nutrition", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition"] });
      onOpenChange(false);
      toast({
        title: material?.nutritionFacts ? "營養成分已更新" : "營養成分已新增",
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
    
    if (!material) {
      toast({
        title: "請選擇原料",
        description: "請先選擇要設定營養成分的原料",
        variant: "destructive",
      });
      return;
    }

    // 驗證至少填寫一個營養成分欄位
    const hasValues = Object.entries(formData).some(([key, value]) => 
      key !== "materialId" && value && value.toString().trim() !== ""
    );

    if (!hasValues) {
      toast({
        title: "請填寫營養成分",
        description: "請至少填寫一個營養成分欄位",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  const handleChange = (field: keyof InsertNutritionFacts, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {material?.nutritionFacts ? "編輯營養成分" : "新增營養成分"}
          </DialogTitle>
          <DialogDescription>
            {material ? `為原料「${material.name}」設定詳細的營養成分資訊` : "設定原料的營養成分資訊"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本營養成分 (每 100g)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calories">熱量 (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.calories}
                  onChange={(e) => handleChange("calories", e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="protein">蛋白質 (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.protein}
                  onChange={(e) => handleChange("protein", e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="fat">脂肪 (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.fat}
                  onChange={(e) => handleChange("fat", e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="carbohydrates">碳水化合物 (g)</Label>
                <Input
                  id="carbohydrates"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.carbohydrates}
                  onChange={(e) => handleChange("carbohydrates", e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>詳細營養成分 (每 100g)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="saturatedFat">飽和脂肪 (g)</Label>
                <Input
                  id="saturatedFat"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.saturatedFat}
                  onChange={(e) => handleChange("saturatedFat", e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="transFat">反式脂肪 (g)</Label>
                <Input
                  id="transFat"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.transFat}
                  onChange={(e) => handleChange("transFat", e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="sugar">糖 (g)</Label>
                <Input
                  id="sugar"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.sugar}
                  onChange={(e) => handleChange("sugar", e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="sodium">鈉 (mg)</Label>
                <Input
                  id="sodium"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.sodium}
                  onChange={(e) => handleChange("sodium", e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "儲存中..." : "儲存營養成分"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
