import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Download, Eye, Calculator, FileImage, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { NutritionLabelModal } from "@/components/modals/nutrition-label-modal";
import { NutritionCalculatorModal } from "@/components/modals/nutrition-calculator-modal";

interface NutritionLabel {
  id: number;
  name: string;
  recipeIds: string[];
  servingSize: number;
  servingsPerPackage: number;
  templateId?: number;
  calculatedNutrition: any;
  generatedFiles?: any;
  createdAt: Date;
  updatedAt: Date;
}

export default function NutritionLabelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState<NutritionLabel | null>(null);
  const queryClient = useQueryClient();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ["/api/nutrition-labels", searchTerm],
    queryFn: () => apiRequest("GET", `/api/nutrition-labels?search=${encodeURIComponent(searchTerm)}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nutrition-labels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-labels"] });
      setShowModal(false);
      setEditingLabel(null);
      toast({ description: "營養標示建立成功" });
    },
    onError: () => {
      toast({ description: "建立營養標示失敗", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/nutrition-labels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-labels"] });
      setShowModal(false);
      setEditingLabel(null);
      toast({ description: "營養標示更新成功" });
    },
    onError: () => {
      toast({ description: "更新營養標示失敗", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/nutrition-labels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-labels"] });
      toast({ description: "營養標示刪除成功" });
    },
    onError: () => {
      toast({ description: "刪除營養標示失敗", variant: "destructive" });
    },
  });

  const handleSubmit = (data: any) => {
    if (editingLabel) {
      updateMutation.mutate({ id: editingLabel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (label: NutritionLabel) => {
    setEditingLabel(label);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此營養標示嗎？")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/nutrition-labels/export", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("匯出失敗");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `營養標示_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ description: "營養標示匯出成功" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ description: "匯出失敗", variant: "destructive" });
    }
  };

  const handleGenerateLabel = async (labelId: number) => {
    try {
      const response = await fetch(`/api/nutrition-labels/${labelId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ format: 'xlsx' }),
      });

      if (!response.ok) {
        throw new Error('生成失敗');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `營養標示-${labelId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ description: "Excel格式營養標示生成成功" });
    } catch (error) {
      console.error('Label generation error:', error);
      toast({ description: "生成Excel格式失敗", variant: "destructive" });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* 標題和操作按鈕 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            <span className="sm:hidden">營養標示</span>
            <span className="hidden sm:inline">營養標示管理</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-2" />
              匯出Excel
            </Button>
            <Button
              onClick={() => setShowCalculatorModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Calculator className="w-4 h-4 mr-2" />
              營養計算器
            </Button>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增營養標示
            </Button>
          </div>
        </div>

        {/* 搜尋列 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜尋營養標示名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* 營養標示列表 */}
        <div className="grid gap-4">
          {labels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-500 text-lg mb-4">尚無營養標示資料</div>
                <Button
                  onClick={() => setShowModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  建立第一個營養標示
                </Button>
              </CardContent>
            </Card>
          ) : (
            labels.map((label: NutritionLabel) => (
              <Card key={label.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {label.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(label)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(label.id)}
                      >
                        刪除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        每份重量：
                      </span>
                      <div>{label.servingSize}g</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        包裝份數：
                      </span>
                      <div>{label.servingsPerPackage}份</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        配方數量：
                      </span>
                      <div>{label.recipeIds.length}個配方</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        建立時間：
                      </span>
                      <div>{formatDate(label.createdAt)}</div>
                    </div>
                  </div>
                  
                  {label.calculatedNutrition && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm font-medium mb-2">營養成分（每份）：</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>熱量：{Math.round(label.calculatedNutrition.perServing?.calories || 0)} kcal</div>
                        <div>蛋白質：{Math.round(label.calculatedNutrition.perServing?.protein || 0)} g</div>
                        <div>脂肪：{Math.round(label.calculatedNutrition.perServing?.fat || 0)} g</div>
                        <div>碳水化合物：{Math.round(label.calculatedNutrition.perServing?.carbohydrates || 0)} g</div>
                      </div>
                      
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateLabel(label.id)}
                          className="text-xs gap-1"
                        >
                          <Download className="w-3 h-3" />
                          下載Excel營養標示
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 營養標示模態框 */}
      {showModal && (
        <NutritionLabelModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingLabel(null);
          }}
          onSubmit={handleSubmit}
          initialData={editingLabel}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* 營養計算器模態框 */}
      {showCalculatorModal && (
        <NutritionCalculatorModal
          isOpen={showCalculatorModal}
          onClose={() => setShowCalculatorModal(false)}
        />
      )}
    </div>
  );
}