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
import type { CustomProductWithDetails, InsertCustomProduct, ProductWithDetails, Packaging, PackagingCategory } from "@shared/schema";

interface CustomProductModalProps {
  customProduct?: CustomProductWithDetails | null;
  onClose: () => void;
}

interface CustomProductItem {
  productId: number;
  quantity: string;
  product?: ProductWithDetails;
  selectedCategory?: string;
}

interface CustomProductPackaging {
  packagingId: number;
  quantity: number;
  packaging?: Packaging;
  selectedCategory?: string;
}

interface ProductSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  products: ProductWithDetails[];
  selectedCategory?: string;
}

function ProductSelect({ value, onValueChange, products, selectedCategory }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const selectedProduct = products.find(p => p.id === value);
  
  // 根據選中的分類和搜尋條件篩選產品
  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchValue.toLowerCase());
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
          {selectedProduct ? (
            <span className="truncate">{selectedProduct.name}</span>
          ) : (
            <span className="text-muted-foreground">選擇產品...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 overflow-hidden" align="start">
        <Command>
          <CommandInput 
            placeholder="搜尋產品..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>找不到相符的產品</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onValueChange(product.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{product.name}</span>
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

export default function CustomProductModal({ customProduct, onClose }: CustomProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertCustomProduct>({
    name: "",
    category: "",
    sellingPrice: "0",
    description: "",
  });
  const [customProductItems, setCustomProductItems] = useState<CustomProductItem[]>([]);
  const [customProductPackaging, setCustomProductPackaging] = useState<CustomProductPackaging[]>([]);

  const { data: products = [] } = useQuery<ProductWithDetails[]>({
    queryKey: ["/api/products"],
  });

  const { data: packaging = [] } = useQuery<Packaging[]>({
    queryKey: ["/api/packaging"],
  });

  const { data: customProductCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number }[]>({
    queryKey: ["/api/custom-product-categories"],
  });

  const { data: productCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number }[]>({
    queryKey: ["/api/product-categories"],
  });

  const { data: categories = [] } = useQuery<PackagingCategory[]>({
    queryKey: ["/api/packaging-categories"],
  });

  useEffect(() => {
    if (customProduct) {
      setFormData({
        name: customProduct.name,
        category: customProduct.category,
        sellingPrice: customProduct.sellingPrice,
        description: customProduct.description || "",
      });
      setCustomProductItems(
        customProduct.items?.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          product: item.product,
          selectedCategory: item.product?.category || "all",
        })) || []
      );
      setCustomProductPackaging(
        customProduct.packaging?.map(pp => ({
          packagingId: pp.packagingId,
          quantity: pp.quantity,
          packaging: pp.packaging,
          selectedCategory: pp.packaging?.type || "",
        })) || []
      );
    } else {
      setFormData({
        name: "",
        category: "",
        sellingPrice: "0",
        description: "",
      });
      setCustomProductItems([]);
      setCustomProductPackaging([]);
    }
  }, [customProduct]);

  const mutation = useMutation({
    mutationFn: (data: { 
      customProduct: InsertCustomProduct; 
      items: CustomProductItem[]; 
      packaging: CustomProductPackaging[];
    }) => {
      const itemsData = data.items
        .filter(item => item.productId && parseFloat(item.quantity) > 0)
        .map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }));

      const packagingData = data.packaging
        .filter(pp => pp.packagingId && pp.quantity > 0)
        .map(pp => ({
          packagingId: pp.packagingId,
          quantity: pp.quantity,
        }));

      if (customProduct && customProduct.id) {
        return apiRequest("PUT", `/api/custom-products/${customProduct.id}`, {
          ...data.customProduct,
          items: itemsData,
          packaging: packagingData,
        });
      } else {
        return apiRequest("POST", "/api/custom-products", {
          ...data.customProduct,
          items: itemsData,
          packaging: packagingData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-products"] });
      onClose();
      toast({
        title: customProduct ? "客製商品已更新" : "客製商品已新增",
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
        description: "客製商品名稱、分類和售價為必填欄位",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ 
      customProduct: formData, 
      items: customProductItems, 
      packaging: customProductPackaging 
    });
  };

  const addItem = () => {
    setCustomProductItems([...customProductItems, { productId: 0, quantity: "1", selectedCategory: "all" }]);
  };

  const removeItem = (index: number) => {
    setCustomProductItems(customProductItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CustomProductItem, value: any) => {
    const newItems = [...customProductItems];
    if (field === "productId") {
      const product = products.find((p: ProductWithDetails) => p.id === value);
      newItems[index] = { ...newItems[index], productId: value, product };
    } else if (field === "selectedCategory") {
      // 如果更改分類，清除已選擇的產品
      newItems[index] = { ...newItems[index], selectedCategory: value, productId: 0, product: undefined };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setCustomProductItems(newItems);
  };

  const addPackaging = () => {
    setCustomProductPackaging([...customProductPackaging, { packagingId: 0, quantity: 1, selectedCategory: "" }]);
  };

  const removePackaging = (index: number) => {
    setCustomProductPackaging(customProductPackaging.filter((_, i) => i !== index));
  };

  const updatePackaging = (index: number, field: keyof CustomProductPackaging, value: any) => {
    const newPackaging = [...customProductPackaging];
    if (field === "packagingId") {
      const pkg = value > 0 ? packaging.find((p: Packaging) => p.id === value) : undefined;
      newPackaging[index] = { ...newPackaging[index], packagingId: value, packaging: pkg };
    } else {
      newPackaging[index] = { ...newPackaging[index], [field]: value };
    }
    setCustomProductPackaging(newPackaging);
  };

  // 計算總成本
  const productCost = customProductItems.reduce((sum, item) => {
    if (item.product && item.quantity) {
      const cost = (item.product.adjustedCost || 0) * parseFloat(item.quantity);
      return sum + cost;
    }
    return sum;
  }, 0);

  const packagingCost = customProductPackaging.reduce((sum, pp) => {
    if (pp.packaging && pp.quantity) {
      return sum + (parseFloat(pp.packaging.unitCost) * pp.quantity);
    }
    return sum;
  }, 0);

  const totalCost = productCost + packagingCost;
  const sellingPrice = parseFloat(formData.sellingPrice);
  const profit = sellingPrice - totalCost;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customProduct ? "編輯客製商品" : "新增客製商品"}</DialogTitle>
          <DialogDescription>
            {customProduct ? "修改客製商品的基本資訊、產品和包裝配置" : "建立一個新的客製商品項目"}
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
                <Label htmlFor="name">客製商品名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="請輸入客製商品名稱"
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
                    {customProductCategories.map((cat) => (
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
              
              <div className="md:col-span-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  defaultValue={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="請輸入客製商品描述"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 產品清單 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>產品清單</CardTitle>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加產品
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {customProductItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>產品分類</Label>
                    <Select 
                      value={item.selectedCategory || "all"} 
                      onValueChange={(value) => updateItem(index, "selectedCategory", value)}
                    >
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
                  </div>
                  
                  <div>
                    <Label>產品</Label>
                    <ProductSelect
                      value={item.productId}
                      onValueChange={(value) => updateItem(index, "productId", value)}
                      products={products}
                      selectedCategory={item.selectedCategory}
                    />
                  </div>
                  
                  <div>
                    <Label>數量</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移除
                    </Button>
                  </div>
                </div>
              ))}
              
              {customProductItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  尚未添加產品，請點擊「添加產品」按鈕
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
              {customProductPackaging.map((pkg, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>包裝分類</Label>
                    <Select 
                      value={pkg.selectedCategory || ""} 
                      onValueChange={(value) => {
                        setCustomProductPackaging(prev => {
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
                      <SelectTrigger>
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
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePackaging(index)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移除
                    </Button>
                  </div>
                </div>
              ))}
              
              {customProductPackaging.length === 0 && (
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
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>總成本</Label>
                  <div className="text-2xl font-bold text-foreground">
                    NT$ {totalCost.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    產品: NT$ {productCost.toFixed(2)}<br/>
                    包裝: NT$ {packagingCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>售價</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    NT$ {sellingPrice.toFixed(2)}
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
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "儲存中..." : "儲存客製商品"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
