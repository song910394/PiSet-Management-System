import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { RecipeWithIngredients, InsertRecipe, Material } from "@shared/schema";

interface RecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: RecipeWithIngredients | null;
}

interface RecipeIngredient {
  materialId: number;
  quantity: string;
  material?: Material;
  selectedCategory?: string;
}

interface MaterialSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  materials: Material[];
  selectedCategory?: string;
}

function MaterialSelect({ value, onValueChange, materials, selectedCategory }: MaterialSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const selectedMaterial = materials.find(m => m.id === value);
  
  // 根據選中的分類和搜尋條件篩選原料
  const filteredMaterials = materials.filter(material => {
    const matchesCategory = !selectedCategory || selectedCategory === "all" || material.category === selectedCategory;
    const matchesSearch = material.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                         material.category.toLowerCase().includes(searchValue.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMaterial ? (
            <span className="truncate">{selectedMaterial.name}</span>
          ) : (
            <span className="text-muted-foreground">選擇原料...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 overflow-hidden" align="start">
        <Command>
          <CommandInput 
            placeholder="搜尋原料..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>找不到相符的原料</CommandEmpty>
            <CommandGroup>
              {filteredMaterials.map((material) => (
                <CommandItem
                  key={material.id}
                  value={material.name}
                  onSelect={() => {
                    onValueChange(material.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === material.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{material.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function RecipeModal({ open, onOpenChange, recipe }: RecipeModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertRecipe>({
    name: "",
    category: "",
    totalPortions: 1,
    totalWeight: "0",
    description: "",
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: recipeCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number }[]>({
    queryKey: ["/api/recipe-categories"],
  });

  const { data: materialCategories = [] } = useQuery<{ id: number; name: string; color: string; sortOrder: number }[]>({
    queryKey: ["/api/material-categories"],
  });

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        category: recipe.category,
        totalPortions: recipe.totalPortions,
        totalWeight: recipe.totalWeight,
        description: recipe.description || "",
      });
      setIngredients(
        recipe.ingredients.map(ing => ({
          materialId: ing.materialId,
          quantity: ing.quantity,
          material: ing.material,
          selectedCategory: ing.material?.category || "all",
        }))
      );
    } else {
      setFormData({
        name: "",
        category: "",
        totalPortions: 1,
        totalWeight: "0",
        description: "",
      });
      setIngredients([]);
    }
  }, [recipe, open]);

  const mutation = useMutation({
    mutationFn: (data: { recipe: InsertRecipe; ingredients: RecipeIngredient[] }) => {
      const ingredientsData = data.ingredients
        .filter(ing => ing.materialId && parseFloat(ing.quantity) > 0)
        .map(ing => ({
          materialId: ing.materialId,
          quantity: ing.quantity,
        }));

      if (recipe && recipe.id) {
        return apiRequest("PUT", `/api/recipes/${recipe.id}`, {
          ...data.recipe,
          ingredients: ingredientsData,
        });
      } else {
        return apiRequest("POST", "/api/recipes", {
          ...data.recipe,
          ingredients: ingredientsData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      onOpenChange(false);
      toast({
        title: recipe ? "配方已更新" : "配方已新增",
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
    
    if (!formData.name.trim() || !formData.category || formData.totalPortions < 1) {
      toast({
        title: "請填寫必填欄位",
        description: "配方名稱、分類和總份量為必填欄位",
        variant: "destructive",
      });
      return;
    }

    if (ingredients.length === 0) {
      toast({
        title: "請添加原料",
        description: "配方至少需要一個原料",
        variant: "destructive",
      });
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.materialId && parseFloat(ing.quantity) > 0);
    if (validIngredients.length === 0) {
      toast({
        title: "請添加有效原料",
        description: "請確保原料用量大於 0",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ recipe: formData, ingredients });
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { materialId: 0, quantity: "0", selectedCategory: "all" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const newIngredients = [...ingredients];
    if (field === "materialId") {
      const material = materials.find((m) => m.id === value);
      newIngredients[index] = { ...newIngredients[index], materialId: value, material };
    } else if (field === "selectedCategory") {
      // 如果更改分類，清除已選擇的原料
      newIngredients[index] = { ...newIngredients[index], selectedCategory: value, materialId: 0, material: undefined };
    } else {
      newIngredients[index] = { ...newIngredients[index], [field]: value };
    }
    setIngredients(newIngredients);
  };

  // 計算總成本
  const totalCost = ingredients.reduce((sum, ing) => {
    const material = materials.find((m) => m.id === ing.materialId);
    if (material && ing.quantity) {
      return sum + (parseFloat(ing.quantity) * parseFloat(material.pricePerGram));
    }
    return sum;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? "編輯配方" : "新增配方"}</DialogTitle>
          <DialogDescription>
            {recipe ? "修改配方的基本資訊和原料配置" : "建立一個新的烘焙配方"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>基本資訊</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">配方名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="請輸入配方名稱"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">分類 *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="totalPortions">總份量 *</Label>
                <Input
                  id="totalPortions"
                  type="number"
                  min="1"
                  value={formData.totalPortions}
                  onChange={(e) => setFormData({ ...formData, totalPortions: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="totalWeight">總重量 (g) *</Label>
                <Input
                  id="totalWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.totalWeight}
                  onChange={(e) => setFormData({ ...formData, totalWeight: e.target.value })}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="請輸入配方描述"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 原料清單 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>原料清單</CardTitle>
              <Button type="button" onClick={addIngredient} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加原料
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>原料分類</Label>
                    <Select 
                      value={ingredient.selectedCategory || "all"} 
                      onValueChange={(value) => updateIngredient(index, "selectedCategory", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇分類" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部分類</SelectItem>
                        {materialCategories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-xs text-white"
                                style={{ backgroundColor: category.color || "#6B7280" }}
                              >
                                {category.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>原料</Label>
                    <MaterialSelect
                      value={ingredient.materialId}
                      onValueChange={(value) => updateIngredient(index, "materialId", value)}
                      materials={materials}
                      selectedCategory={ingredient.selectedCategory}
                    />
                  </div>
                  
                  <div>
                    <Label>用量 (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移除
                    </Button>
                  </div>
                </div>
              ))}
              
              {ingredients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  尚未添加原料，請點擊「添加原料」按鈕
                </div>
              )}
            </CardContent>
          </Card>

          {/* 成本計算 */}
          {totalCost > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>成本計算</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>總成本</Label>
                  <div className="text-2xl font-bold text-foreground">
                    NT$ {totalCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>每份成本</Label>
                  <div className="text-2xl font-bold text-green-600">
                    NT$ {(totalCost / formData.totalPortions).toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>每克成本</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    NT$ {(totalCost / parseFloat(formData.totalWeight || "1")).toFixed(4)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "儲存中..." : "儲存配方"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
