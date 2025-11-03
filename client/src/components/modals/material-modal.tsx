import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Material, InsertMaterial } from "@shared/schema";

interface MaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
}

export default function MaterialModal({ open, onOpenChange, material }: MaterialModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertMaterial>({
    name: "",
    category: "",
    pricePerGram: "0",
    notes: "",
    purchaseAmount: "",
    purchaseWeight: "",
    managementFeeRate: "",
    purchaseTime: null,
    purchaseLocation: "",
  });

  const { data: materialCategories = [] } = useQuery<{ id: number; name: string; sortOrder: number }[]>({
    queryKey: ["/api/material-categories"],
  });

  useEffect(() => {
    if (open) {
      if (material) {
        console.log("Setting form data for material:", material);
        setFormData({
          name: material.name,
          category: material.category,
          pricePerGram: material.pricePerGram,
          notes: material.notes || "",
          purchaseAmount: material.purchaseAmount || "",
          purchaseWeight: material.purchaseWeight || "",
          managementFeeRate: material.managementFeeRate || "",
          purchaseTime: material.purchaseTime,
          purchaseLocation: material.purchaseLocation || "",
        });
      } else {
        console.log("Resetting form data for new material");
        setFormData({
          name: "",
          category: "",
          pricePerGram: "0",
          notes: "",
          purchaseAmount: "",
          purchaseWeight: "",
          managementFeeRate: "",
          purchaseTime: null,
          purchaseLocation: "",
        });
      }
    }
  }, [material, open]);

  const mutation = useMutation({
    mutationFn: (data: InsertMaterial) => {
      // 清理空值資料並轉換時間格式
      const cleanedData = {
        ...data,
        purchaseAmount: data.purchaseAmount === "" ? null : data.purchaseAmount,
        purchaseWeight: data.purchaseWeight === "" ? null : data.purchaseWeight,
        managementFeeRate: data.managementFeeRate === "" ? null : data.managementFeeRate,
        purchaseLocation: data.purchaseLocation === "" ? null : data.purchaseLocation,
        purchaseTime: data.purchaseTime ? new Date(data.purchaseTime) : null,
      };
      
      if (material) {
        return apiRequest("PUT", `/api/materials/${material.id}`, cleanedData);
      } else {
        return apiRequest("POST", "/api/materials", cleanedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      onOpenChange(false);
      toast({
        title: material ? "原料已更新" : "原料已新增",
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

  // 價格自動計算功能
  const calculatePrice = useCallback((purchaseAmount: string, purchaseWeight: string, managementFeeRate: string) => {
    const amount = parseFloat(purchaseAmount);
    const weight = parseFloat(purchaseWeight);
    const feeRate = parseFloat(managementFeeRate) || 0;
    
    if (amount && weight && amount > 0 && weight > 0) {
      const calculatedPrice = (amount * (1 + feeRate / 100)) / weight;
      return calculatedPrice.toFixed(4);
    }
    return "";
  }, []);

  // 監聽購入相關欄位變化，自動計算價格
  useEffect(() => {
    if (formData.purchaseAmount && formData.purchaseWeight) {
      const calculatedPrice = calculatePrice(
        formData.purchaseAmount,
        formData.purchaseWeight,
        formData.managementFeeRate || "0"
      );
      if (calculatedPrice) {
        setFormData(prev => ({ ...prev, pricePerGram: calculatedPrice }));
      }
    }
  }, [formData.purchaseAmount, formData.purchaseWeight, formData.managementFeeRate, calculatePrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.category || !formData.pricePerGram) {
      toast({
        title: "請填寫必填欄位",
        description: "原料名稱、分類和每克單價為必填欄位",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(formData.pricePerGram) < 0) {
      toast({
        title: "價格不能為負數",
        description: "請輸入有效的價格",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? "編輯原料" : "新增原料"}</DialogTitle>
          <DialogDescription>
            {material ? "修改原料的基本資訊和價格" : "新增一個新的烘焙原料到系統中"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">原料名稱 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="請輸入原料名稱"
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
                {materialCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="pricePerGram">每克單價 (元) *</Label>
            <Input
              id="pricePerGram"
              type="number"
              step="0.0001"
              min="0"
              value={formData.pricePerGram}
              onChange={(e) => setFormData({ ...formData, pricePerGram: e.target.value })}
              placeholder="0.0000"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              value={formData.notes ?? ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="請輸入備註資訊"
              rows={3}
            />
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">購入資訊（選填）</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseAmount">購入金額</Label>
                <Input
                  id="purchaseAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchaseAmount || ""}
                  onChange={(e) => setFormData({ ...formData, purchaseAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="purchaseWeight">購入重量 (g)</Label>
                <Input
                  id="purchaseWeight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchaseWeight || ""}
                  onChange={(e) => setFormData({ ...formData, purchaseWeight: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="managementFeeRate">管理費率 (%)</Label>
              <Input
                id="managementFeeRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.managementFeeRate || ""}
                onChange={(e) => setFormData({ ...formData, managementFeeRate: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                當填入購入金額、重量和管理費率時，系統將自動計算每克單價
              </p>
            </div>
            
            <div>
              <Label htmlFor="purchaseTime">購入時間</Label>
              <Input
                id="purchaseTime"
                type="datetime-local"
                value={formData.purchaseTime ? new Date(formData.purchaseTime).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  purchaseTime: e.target.value ? new Date(e.target.value) : null 
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="purchaseLocation">購入地點</Label>
              <Input
                id="purchaseLocation"
                value={formData.purchaseLocation || ""}
                onChange={(e) => setFormData({ ...formData, purchaseLocation: e.target.value })}
                placeholder="請輸入購入地點"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
