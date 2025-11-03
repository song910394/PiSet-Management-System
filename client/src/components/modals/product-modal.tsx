import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { ProductWithDetails, InsertProduct, RecipeWithIngredients, Packaging, PackagingCategory } from "@shared/schema";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductWithDetails | null;
}

interface ProductRecipe {
  recipeId: number;
  quantity: string;
  unit: "portions" | "grams";
  recipe?: RecipeWithIngredients;
  selectedCategory?: string;
}

interface ProductPackaging {
  packagingId: number;
  quantity: number;
  packaging?: Packaging;
  selectedCategory?: string;
}

interface RecipeSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  recipes: RecipeWithIngredients[];
  selectedCategory?: string;
}

function RecipeSelect({ value, onValueChange, recipes, selectedCategory }: RecipeSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const selectedRecipe = recipes.find(r => r.id === value);
  
  // 根據選中的分類和搜尋條件篩選配方
  const filteredRecipes = recipes.filter(recipe => {
    const matchesCategory = !selectedCategory || selectedCategory === "all" || recipe.category === selectedCategory;
    const matchesSearch = recipe.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                         recipe.category.toLowerCase().includes(searchValue.toLowerCase());
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
          {selectedRecipe ? (
            <span className="truncate">{selectedRecipe.name}</span>
          ) : (
            <span className="text-muted-foreground">選擇配方...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 overflow-hidden" align="start">
        <Command>
          <CommandInput 
            placeholder="搜尋配方..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>找不到相符的配方</CommandEmpty>
            <CommandGroup>
              {filteredRecipes.map((recipe) => (
                <CommandItem
                  key={recipe.id}
                  value={recipe.name}
                  onSelect={() => {
                    onValueChange(recipe.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === recipe.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{recipe.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface PackagingSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  packaging: Packaging[];
  selectedCategory?: string;
}

function PackagingSelect({ value, onValueChange, packaging, selectedCategory }: PackagingSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const selectedPackaging = packaging.find(p => p.id === value);
  
  // 根據選中的分類和搜尋條件篩選包裝材料
  const filteredPackaging = packaging.filter(pkg => {
    const matchesCategory = !selectedCategory || pkg.type === selectedCategory;
    const matchesSearch = pkg.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                         pkg.type.toLowerCase().includes(searchValue.toLowerCase());
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
          {selectedPackaging ? (
            <span className="truncate">{selectedPackaging.name}</span>
          ) : (
            <span className="text-muted-foreground">選擇包裝...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 overflow-hidden" align="start">
        <Command>
          <CommandInput 
            placeholder="搜尋包裝..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>找不到相符的包裝</CommandEmpty>
            <CommandGroup>
              {filteredPackaging.map((pkg) => (
                <CommandItem
                  key={pkg.id}
                  value={pkg.name}
                  onSelect={() => {
                    onValueChange(pkg.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === pkg.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{pkg.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ProductModal({ open, onOpenChange, product }: ProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertProduct>({
    name: "",
    category: "",
    sellingPrice: "0",
    managementFeePercentage: "3.00",
    description: "",
  });
  const [productRecipes, setProductRecipes] = useState<ProductRecipe[]>([]);
  const [productPackaging, setProductPackaging] = useState<ProductPackaging[]>([]);

  const { data: recipes = [] } = useQuery<RecipeWithIngredients[]>({
    queryKey: ["/api/recipes"],
  });

  const { data: packaging = [] } = useQuery<Packaging[]>({
    queryKey: ["/api/packaging"],
  });

  const { data: productCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number }[]>({
    queryKey: ["/api/product-categories"],
  });

  const { data: recipeCategories = [] } = useQuery<{ id: number; name: string; color: string; sortOrder: number }[]>({
    queryKey: ["/api/recipe-categories"],
  });

  const { data: categories = [] } = useQuery<PackagingCategory[]>({
    queryKey: ["/api/packaging-categories"],
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        sellingPrice: product.sellingPrice,
        managementFeePercentage: product.managementFeePercentage || "3.00",
        description: product.description || "",
      });
      setProductRecipes(
        product.recipes.map(pr => ({
          recipeId: pr.recipeId,
          quantity: pr.quantity,
          unit: pr.unit as "portions" | "grams",
          recipe: pr.recipe,
          selectedCategory: pr.recipe?.category || "all",
        }))
      );
      setProductPackaging(
        product.packaging.map(pp => ({
          packagingId: pp.packagingId,
          quantity: pp.quantity,
          packaging: pp.packaging,
          selectedCategory: pp.packaging?.type || "",
        }))
      );
    } else {
      setFormData({
        name: "",
        category: "",
        sellingPrice: "0",
        managementFeePercentage: "3.00",
        description: "",
      });
      setProductRecipes([]);
      setProductPackaging([]);
    }
  }, [product, open]);

  const mutation = useMutation({
    mutationFn: (data: { 
      product: InsertProduct; 
      recipes: ProductRecipe[]; 
      packaging: ProductPackaging[];
    }) => {
      const recipesData = data.recipes
        .filter(pr => pr.recipeId && parseFloat(pr.quantity) > 0)
        .map(pr => ({
          recipeId: pr.recipeId,
          quantity: pr.quantity,
          unit: pr.unit,
        }));

      const packagingData = data.packaging
        .filter(pp => pp.packagingId && pp.quantity > 0)
        .map(pp => ({
          packagingId: pp.packagingId,
          quantity: pp.quantity,
        }));

      if (product && product.id) {
        return apiRequest("PUT", `/api/products/${product.id}`, {
          ...data.product,
          recipes: recipesData,
          packaging: packagingData,
        });
      } else {
        return apiRequest("POST", "/api/products", {
          ...data.product,
          recipes: recipesData,
          packaging: packagingData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onOpenChange(false);
      toast({
        title: product ? "商品已更新" : "商品已新增",
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
    
    if (!formData.name.trim() || !formData.category || parseFloat(formData.sellingPrice) <= 0) {
      toast({
        title: "請填寫必填欄位",
        description: "商品名稱、分類和售價為必填欄位",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ 
      product: formData, 
      recipes: productRecipes, 
      packaging: productPackaging 
    });
  };

  const addRecipe = () => {
    setProductRecipes([...productRecipes, { recipeId: 0, quantity: "0", unit: "portions", selectedCategory: "all" }]);
  };

  const removeRecipe = (index: number) => {
    setProductRecipes(productRecipes.filter((_, i) => i !== index));
  };

  const updateRecipe = (index: number, field: keyof ProductRecipe, value: any) => {
    const newRecipes = [...productRecipes];
    if (field === "recipeId") {
      const recipe = recipes.find((r: RecipeWithIngredients) => r.id === value);
      newRecipes[index] = { ...newRecipes[index], recipeId: value, recipe };
    } else if (field === "selectedCategory") {
      // 如果更改分類，清除已選擇的配方
      newRecipes[index] = { ...newRecipes[index], selectedCategory: value, recipeId: 0, recipe: undefined };
    } else {
      newRecipes[index] = { ...newRecipes[index], [field]: value };
    }
    setProductRecipes(newRecipes);
  };

  const addPackaging = () => {
    setProductPackaging([...productPackaging, { packagingId: 0, quantity: 1, selectedCategory: "" }]);
  };

  const removePackaging = (index: number) => {
    setProductPackaging(productPackaging.filter((_, i) => i !== index));
  };

  const updatePackaging = (index: number, field: keyof ProductPackaging, value: any) => {
    const newPackaging = [...productPackaging];
    if (field === "packagingId") {
      const pkg = value > 0 ? packaging.find((p: Packaging) => p.id === value) : undefined;
      newPackaging[index] = { ...newPackaging[index], packagingId: value, packaging: pkg };
    } else {
      newPackaging[index] = { ...newPackaging[index], [field]: value };
    }
    setProductPackaging(newPackaging);
  };

  // 計算總成本
  const recipeCost = productRecipes.reduce((sum, pr) => {
    if (pr.recipe && pr.quantity) {
      const cost = pr.unit === "portions" 
        ? (pr.recipe.costPerPortion || 0) * parseFloat(pr.quantity)
        : (pr.recipe.costPerGram || 0) * parseFloat(pr.quantity);
      return sum + cost;
    }
    return sum;
  }, 0);

  const packagingCost = productPackaging.reduce((sum, pp) => {
    if (pp.packaging && pp.quantity) {
      return sum + (parseFloat(pp.packaging.unitCost) * pp.quantity);
    }
    return sum;
  }, 0);

  const totalCost = recipeCost + packagingCost;
  const managementFeePercentage = parseFloat(formData.managementFeePercentage || "0") || 0;
  const managementFee = totalCost * (managementFeePercentage / 100);
  const adjustedCost = totalCost + managementFee;
  const sellingPrice = parseFloat(formData.sellingPrice);
  const profit = sellingPrice - adjustedCost;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "編輯商品" : "新增商品"}</DialogTitle>
          <DialogDescription>
            {product ? "修改商品的基本資訊、配方和包裝配置" : "建立一個新的商品項目"}
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
                <Label htmlFor="name">商品名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="請輸入商品名稱"
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
                    {productCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sellingPrice">售價 (NT$) *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="managementFeePercentage">管理費 (%) *</Label>
                <Input
                  id="managementFeePercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.managementFeePercentage}
                  onChange={(e) => setFormData({ ...formData, managementFeePercentage: e.target.value })}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  defaultValue={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="請輸入商品描述"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 產品配方 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>產品配方</CardTitle>
              <Button type="button" onClick={addRecipe} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加配方
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {productRecipes.map((recipe, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>配方分類</Label>
                    <Select 
                      value={recipe.selectedCategory || "all"} 
                      onValueChange={(value) => updateRecipe(index, "selectedCategory", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇分類" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部分類</SelectItem>
                        {recipeCategories.map((category) => (
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
                    <Label>配方</Label>
                    <RecipeSelect
                      value={recipe.recipeId}
                      onValueChange={(value) => updateRecipe(index, "recipeId", value)}
                      recipes={recipes}
                      selectedCategory={recipe.selectedCategory}
                    />
                  </div>
                  
                  <div>
                    <Label>數量</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={recipe.quantity}
                      onChange={(e) => updateRecipe(index, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label>單位</Label>
                    <Select 
                      value={recipe.unit} 
                      onValueChange={(value) => updateRecipe(index, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portions">份</SelectItem>
                        <SelectItem value="grams">克</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRecipe(index)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移除
                    </Button>
                  </div>
                </div>
              ))}
              
              {productRecipes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  尚未添加配方，請點擊「添加配方」按鈕
                </div>
              )}
            </CardContent>
          </Card>

          {/* 包裝材料 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>包裝材料</CardTitle>
              <Button type="button" onClick={addPackaging} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加包裝
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {productPackaging.map((pkg, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>包裝分類</Label>
                    <Select 
                      value={pkg.selectedCategory || ""} 
                      onValueChange={(value) => {
                        // 使用函數式狀態更新來確保批次更新正確執行
                        setProductPackaging(prev => {
                          const newPackaging = [...prev];
                          newPackaging[index] = {
                            ...newPackaging[index],
                            selectedCategory: value,
                            packagingId: 0,
                            packaging: undefined
                          };
                          return newPackaging;
                        });
                      }}
                    >
                      <SelectTrigger data-testid={`select-category-${index}`}>
                        <SelectValue placeholder="選擇分類" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>包裝材料</Label>
                    <PackagingSelect
                      value={pkg.packagingId}
                      onValueChange={(value) => updatePackaging(index, "packagingId", value)}
                      packaging={packaging}
                      selectedCategory={pkg.selectedCategory}
                    />
                  </div>
                  
                  <div>
                    <Label>數量</Label>
                    <Input
                      type="number"
                      min="1"
                      value={pkg.quantity}
                      onChange={(e) => updatePackaging(index, "quantity", parseInt(e.target.value) || 1)}
                      placeholder="1"
                      data-testid={`input-quantity-${index}`}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePackaging(index)}
                      className="w-full"
                      data-testid={`button-remove-packaging-${index}`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移除
                    </Button>
                  </div>
                </div>
              ))}
              
              {productPackaging.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  尚未添加包裝材料，請點擊「添加包裝」按鈕
                </div>
              )}
            </CardContent>
          </Card>

          {/* 成本與利潤計算 */}
          {totalCost > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>成本與利潤分析</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label>原成本</Label>
                  <div className="text-2xl font-bold text-foreground">
                    NT$ {totalCost.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    配方: NT$ {recipeCost.toFixed(2)}<br/>
                    包裝: NT$ {packagingCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>管理費</Label>
                  <div className="text-xl font-bold text-orange-600">
                    NT$ {managementFee.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {managementFeePercentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <Label>攤提後成本</Label>
                  <div className="text-2xl font-bold text-purple-600">
                    NT$ {adjustedCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>利潤</Label>
                  <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    NT$ {profit.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>利潤率</Label>
                  <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
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
              {mutation.isPending ? "儲存中..." : "儲存商品"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
