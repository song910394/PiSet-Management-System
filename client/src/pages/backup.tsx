import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CloudUpload, Download, Upload, AlertCircle, Server, Trash2, RotateCcw, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ServerBackup {
  filename: string;
  filepath: string;
  timestamp: string;
  size: number;
  description?: string;
}

export default function Backup() {
  const { toast } = useToast();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringLocal, setIsRestoringLocal] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<ServerBackup | null>(null);

  // 載入伺服器備份列表
  const { data: serverBackups = [], isLoading: isLoadingBackups } = useQuery<ServerBackup[]>({
    queryKey: ["/api/backup/list"],
  });

  // 手動創建備份
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await fetch("/api/backup/create", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("備份創建失敗");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/backup/list"] });
      
      toast({
        title: "備份完成",
        description: "系統備份已成功創建並保存到伺服器",
      });
    } catch (error) {
      toast({
        title: "備份失敗",
        description: error instanceof Error ? error.message : "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // 從伺服器下載備份檔
  const handleDownloadBackup = (backup: ServerBackup) => {
    const link = document.createElement("a");
    link.href = `/api/backup/download/${backup.filename}`;
    link.download = backup.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "下載開始",
      description: "備份檔案正在下載到您的電腦",
    });
  };

  // 從伺服器備份還原
  const handleRestoreFromServer = async () => {
    if (!selectedBackup) return;

    setRestoreDialogOpen(false);
    
    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backupPath: selectedBackup.filepath,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "還原失敗");
      }

      const result = await response.json();

      // 刷新所有資料
      await queryClient.invalidateQueries();

      toast({
        title: "還原完成",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "還原失敗",
        description: error instanceof Error ? error.message : "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setSelectedBackup(null);
    }
  };

  // 刪除伺服器備份
  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    setDeleteDialogOpen(false);

    try {
      const response = await fetch(`/api/backup/${selectedBackup.filename}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("刪除備份失敗");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/backup/list"] });

      toast({
        title: "刪除完成",
        description: "備份檔案已從伺服器刪除",
      });
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setSelectedBackup(null);
    }
  };

  // 從本地檔案還原
  const handleRestoreFromLocal = async (file: File) => {
    setIsRestoringLocal(true);
    try {
      const formData = new FormData();
      formData.append("backupFile", file);

      const response = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "還原失敗");
      }

      const result = await response.json();

      // 刷新所有資料
      await queryClient.invalidateQueries();

      toast({
        title: "還原完成",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "還原失敗",
        description: error instanceof Error ? error.message : "請檢查備份檔案格式",
        variant: "destructive",
      });
    } finally {
      setIsRestoringLocal(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleRestoreFromLocal(file);
      // 清空 input 值，允許重複選擇同一檔案
      event.target.value = "";
    }
  };

  // 格式化檔案大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 格式化時間
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "無效時間";
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">備份與還原管理</h2>
        <p className="text-muted-foreground">
          系統自動每日備份，保留10次。您也可以手動創建備份或從檔案還原。
        </p>
      </div>

      {/* 手動操作區 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              手動備份
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              立即創建完整的系統備份，包含所有原料、配方、商品、客制商品、包裝和營養資料。
            </p>

            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-create-backup"
            >
              {isCreatingBackup ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  創建中...
                </>
              ) : (
                <>
                  <CloudUpload className="mr-2 h-4 w-4" />
                  立即備份
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="mr-2 h-5 w-5" />
              本地檔案還原
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              從本地備份檔案還原系統。
            </p>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                警告：還原將覆蓋現有資料
              </AlertDescription>
            </Alert>

            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="restore-file"
              disabled={isRestoringLocal}
              data-testid="input-restore-file"
            />
            <label htmlFor="restore-file">
              <Button
                variant="outline"
                disabled={isRestoringLocal}
                className="w-full cursor-pointer"
                asChild
                data-testid="button-restore-local"
              >
                <span>
                  {isRestoringLocal ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      還原中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      開始還原
                    </>
                  )}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* 伺服器備份列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              伺服器備份列表
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {serverBackups.length} / 10 個備份
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">載入備份列表...</span>
            </div>
          ) : serverBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>尚無伺服器備份</p>
              <p className="text-sm mt-1">點擊上方「立即備份」創建第一個備份</p>
            </div>
          ) : (
            <div className="space-y-2">
              {serverBackups.map((backup) => (
                <div
                  key={backup.filename}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`backup-item-${backup.filename}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {backup.description || backup.filename}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(backup.timestamp)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(backup.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadBackup(backup)}
                      data-testid={`button-download-${backup.filename}`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      下載
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setRestoreDialogOpen(true);
                      }}
                      data-testid={`button-restore-${backup.filename}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      還原
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-${backup.filename}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自動備份狀態 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>自動備份狀態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>系統會在每日第一次登入時自動建立備份（以台灣時間為準）</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>伺服器自動保留最近10次備份，舊備份會自動清理</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>備份包含：原料、配方、商品、客制商品、包裝材料、營養成分及標示等所有資料</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>重要資料建議定期下載到本機保存</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 還原確認對話框 */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認還原資料？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將使用備份檔案 <strong>{selectedBackup?.filename}</strong> 還原所有系統資料。
              <br />
              <br />
              <span className="text-destructive font-semibold">
                警告：此操作將覆蓋所有現有資料，無法復原！
              </span>
              <br />
              <br />
              建議在還原前先創建當前資料的備份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreFromServer}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-restore"
            >
              確認還原
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除備份？</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除備份檔案 <strong>{selectedBackup?.filename}</strong> 嗎？
              <br />
              <br />
              此操作無法復原，刪除後將無法使用此備份還原資料。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBackup}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
