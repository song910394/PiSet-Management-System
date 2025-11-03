import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Upload, AlertTriangle, CheckCircle, Clock, Server, Trash2, RefreshCw, HardDrive } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BackupFile {
  filename: string;
  filepath: string;
  timestamp: string;
  size: number;
  description?: string;
}

export default function BackupNew() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupFile | null>(null);
  const { toast } = useToast();

  // 獲取伺服器備份清單
  const { data: serverBackups = [], isLoading: loadingBackups, refetch: refetchBackups } = useQuery<BackupFile[]>({
    queryKey: ["/api/backup/list"],
  });

  // 創建新備份
  const createBackup = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/backup/create", {});
    },
    onSuccess: () => {
      toast({
        title: "備份創建成功",
        description: "新的系統備份已創建完成",
      });
      refetchBackups();
    },
    onError: (error: any) => {
      toast({
        title: "備份創建失敗",
        description: error.message || "未知錯誤",
        variant: "destructive",
      });
    },
  });

  // 從伺服器備份還原
  const restoreFromServer = useMutation({
    mutationFn: async (backupPath: string) => {
      return await apiRequest("POST", "/api/backup/restore", { backupPath });
    },
    onSuccess: (data: any) => {
      toast({
        title: "還原成功",
        description: data.message,
      });
      setShowRestoreDialog(false);
      setSelectedBackup(null);
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packaging"] });
    },
    onError: (error: any) => {
      toast({
        title: "還原失敗",
        description: error.message || "未知錯誤",
        variant: "destructive",
      });
    },
  });

  // 從本地檔案還原
  const restoreFromFile = useMutation({
    mutationFn: async (file: File) => {
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

      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "還原成功",
        description: data.message,
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packaging"] });
    },
    onError: (error: any) => {
      toast({
        title: "還原失敗",
        description: error.message || "未知錯誤",
        variant: "destructive",
      });
    },
  });

  // 刪除備份檔案
  const deleteBackup = useMutation({
    mutationFn: async (filename: string) => {
      return await apiRequest("DELETE", `/api/backup/${filename}`, {});
    },
    onSuccess: () => {
      toast({
        title: "刪除成功",
        description: "備份檔案已刪除",
      });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      refetchBackups();
    },
    onError: (error: any) => {
      toast({
        title: "刪除失敗",
        description: error.message || "未知錯誤",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">備份與還原管理</h2>
        <p className="text-muted-foreground">系統自動每日備份，保留7天。您也可以手動創建備份或從檔案還原。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 手動備份 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              手動備份
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              立即創建完整的系統備份
            </p>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                包含所有原料、配方、商品、包裝和營養資料
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => createBackup.mutate()}
              disabled={createBackup.isPending}
              className="w-full"
            >
              {createBackup.isPending ? "正在創建..." : "立即備份"}
            </Button>
          </CardContent>
        </Card>

        {/* 本地檔案還原 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              本地檔案還原
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              從本地備份檔案還原系統
            </p>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>警告：</strong>還原將覆蓋現有資料
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={restoreFromFile.isPending}
              />
              
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  已選擇：{selectedFile.name}
                </p>
              )}
            </div>

            <Button 
              onClick={() => selectedFile && restoreFromFile.mutate(selectedFile)}
              disabled={!selectedFile || restoreFromFile.isPending}
              variant="destructive"
              className="w-full"
            >
              {restoreFromFile.isPending ? "正在還原..." : "開始還原"}
            </Button>
          </CardContent>
        </Card>

        {/* 自動備份狀態 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              自動備份狀態
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                已啟用
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 每日凌晨2點自動備份</p>
              <p>• 自動保留最近7天備份</p>
              <p>• 自動清理過期備份檔案</p>
            </div>

            <Alert>
              <HardDrive className="h-4 w-4" />
              <AlertDescription>
                目前有 {serverBackups.length} 個伺服器備份檔案
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* 伺服器備份清單 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            伺服器備份清單
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchBackups()}
            disabled={loadingBackups}
          >
            <RefreshCw className={`h-4 w-4 ${loadingBackups ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <div className="text-center py-8 text-muted-foreground">
              正在載入備份清單...
            </div>
          ) : serverBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暫無伺服器備份檔案
            </div>
          ) : (
            <div className="space-y-3">
              {serverBackups.map((backup) => (
                <div key={backup.filename} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{backup.filename}</h4>
                      <Badge variant="outline">{formatFileSize(backup.size)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(backup.timestamp)} • {backup.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setShowRestoreDialog(true);
                      }}
                    >
                      還原
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget(backup);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 還原確認對話框 */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認還原系統</DialogTitle>
            <DialogDescription>
              您即將從以下備份還原系統資料：
            </DialogDescription>
          </DialogHeader>
          
          {selectedBackup && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p><strong>檔案名稱：</strong>{selectedBackup.filename}</p>
              <p><strong>建立時間：</strong>{formatDate(selectedBackup.timestamp)}</p>
              <p><strong>檔案大小：</strong>{formatFileSize(selectedBackup.size)}</p>
            </div>
          )}
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>警告：</strong>此操作將覆蓋所有現有資料，包括原料、配方、商品、包裝和營養資料。請確保您已了解此操作的影響。
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedBackup && restoreFromServer.mutate(selectedBackup.filepath)}
              disabled={restoreFromServer.isPending}
            >
              {restoreFromServer.isPending ? "正在還原..." : "確認還原"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除備份</DialogTitle>
            <DialogDescription>
              您即將刪除以下備份檔案：
            </DialogDescription>
          </DialogHeader>
          
          {deleteTarget && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p><strong>檔案名稱：</strong>{deleteTarget.filename}</p>
              <p><strong>建立時間：</strong>{formatDate(deleteTarget.timestamp)}</p>
            </div>
          )}
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              此操作無法復原。刪除後將無法從此備份檔案還原資料。
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteTarget && deleteBackup.mutate(deleteTarget.filename)}
              disabled={deleteBackup.isPending}
            >
              {deleteBackup.isPending ? "正在刪除..." : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}