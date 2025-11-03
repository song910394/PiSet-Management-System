import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, User, Trash2, Plus, Edit } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { MaterialHistory } from "@shared/schema";

interface MaterialHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: number;
  materialName: string;
}

const actionLabels = {
  CREATE: "新增",
  UPDATE: "更新", 
  DELETE: "刪除"
};

const actionIcons = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2
};

const actionColors = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export default function MaterialHistoryModal({ 
  open, 
  onOpenChange, 
  materialId, 
  materialName 
}: MaterialHistoryModalProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["/api/materials", materialId, "history"],
    queryFn: () => fetch(`/api/materials/${materialId}/history`).then(res => res.json()),
    enabled: open && materialId > 0
  });

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return "無";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (value instanceof Date) return format(value, "yyyy/MM/dd HH:mm", { locale: zhTW });
    return JSON.stringify(value);
  };

  const renderFieldChanges = (item: MaterialHistory) => {
    if (!item.changedFields || item.changedFields.length === 0) return null;

    const fieldLabels: Record<string, string> = {
      name: "原料名稱",
      category: "分類",
      pricePerGram: "每克單價",
      notes: "備註",
      purchaseAmount: "購入金額",
      purchaseWeight: "購入重量",
      managementFeeRate: "管理費率",
      purchaseTime: "購入時間",
      purchaseLocation: "購入地點"
    };

    return (
      <div className="mt-3 space-y-2">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">變更內容：</h5>
        {item.changedFields.map(field => (
          <div key={field} className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-sm font-medium">{fieldLabels[field] || field}：</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="text-red-600 dark:text-red-400">
                {formatFieldValue(item.previousData?.[field])}
              </span>
              <span className="mx-2">→</span>
              <span className="text-green-600 dark:text-green-400">
                {formatFieldValue(item.newData?.[field])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {materialName} - 異動履歷
          </DialogTitle>
          <DialogDescription>
            查看此原料的價格變動記錄和進貨歷史
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">載入中...</div>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">暫無異動紀錄</div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item: MaterialHistory, index: number) => {
                const ActionIcon = actionIcons[item.action as keyof typeof actionIcons];
                return (
                  <div key={item.id} className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800">
                          <ActionIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={actionColors[item.action as keyof typeof actionColors]}>
                              {actionLabels[item.action as keyof typeof actionLabels]}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              #{history.length - index}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(item.createdAt), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {item.changeDescription && (
                      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.changeDescription}
                      </p>
                    )}
                    
                    {renderFieldChanges(item)}
                    
                    {index < history.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}