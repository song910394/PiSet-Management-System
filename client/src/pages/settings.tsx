import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Lock, LogOut, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ProfitMarginSettings {
  lowThreshold: number;
  highThreshold: number;
}

export default function Settings() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [profitMarginData, setProfitMarginData] = useState<ProfitMarginSettings>({
    lowThreshold: 20,
    highThreshold: 40
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"]
  });

  // 當設定資料載入時更新狀態
  useEffect(() => {
    if (settings?.profitMargin) {
      setProfitMarginData(settings.profitMargin);
    }
  }, [settings]);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("PUT", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({ title: "密碼修改成功" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: "密碼修改失敗", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateProfitMarginMutation = useMutation({
    mutationFn: (data: ProfitMarginSettings) =>
      apiRequest("PUT", "/api/settings/profit-margin", data),
    onSuccess: () => {
      toast({ title: "利潤率設定已保存" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "保存失敗", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      toast({ title: "已成功登出" });
      setLocation("/");
    },
    onError: () => {
      toast({ 
        title: "登出失敗", 
        variant: "destructive" 
      });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({ 
        title: "請填寫所有密碼欄位", 
        variant: "destructive" 
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ 
        title: "新密碼確認不符", 
        variant: "destructive" 
      });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleProfitMarginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profitMarginData.lowThreshold >= profitMarginData.highThreshold) {
      toast({ 
        title: "低門檻值必須小於高門檻值", 
        variant: "destructive" 
      });
      return;
    }
    updateProfitMarginMutation.mutate(profitMarginData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">帳號設定</h2>
          <p className="text-muted-foreground">管理您的帳號和系統設定</p>
        </div>
        <Button variant="outline" onClick={() => logoutMutation.mutate()}>
          <LogOut className="mr-2 h-4 w-4" />
          登出
        </Button>
      </div>

      {/* 帳號資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            帳號資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>帳號名稱</Label>
              <Input value="admin" disabled className="mt-1" />
            </div>
            <div>
              <Label>權限等級</Label>
              <Input value="系統管理員" disabled className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 密碼修改 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            修改密碼
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="current-password">當前密碼</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="請輸入當前密碼"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                disabled={changePasswordMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="new-password">新密碼</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="請輸入新密碼"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                disabled={changePasswordMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">確認新密碼</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="請再次輸入新密碼"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                disabled={changePasswordMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {changePasswordMutation.isPending ? "修改中..." : "修改密碼"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 利潤率設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="mr-2 h-5 w-5" />
            利潤率顏色指標設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfitMarginSubmit} className="space-y-4">
            <div>
              <Label htmlFor="low-threshold">低利潤率門檻 (%)</Label>
              <Input
                id="low-threshold"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="例如：20"
                value={profitMarginData.lowThreshold}
                onChange={(e) => setProfitMarginData({ 
                  ...profitMarginData, 
                  lowThreshold: parseFloat(e.target.value) || 0 
                })}
                disabled={updateProfitMarginMutation.isPending}
              />
              <p className="text-sm text-muted-foreground mt-1">低於此值顯示紅色</p>
            </div>
            <div>
              <Label htmlFor="high-threshold">高利潤率門檻 (%)</Label>
              <Input
                id="high-threshold"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="例如：40"
                value={profitMarginData.highThreshold}
                onChange={(e) => setProfitMarginData({ 
                  ...profitMarginData, 
                  highThreshold: parseFloat(e.target.value) || 0 
                })}
                disabled={updateProfitMarginMutation.isPending}
              />
              <p className="text-sm text-muted-foreground mt-1">高於此值顯示綠色，中間範圍顯示黃色</p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">顏色預覽</h4>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span>&lt; {profitMarginData.lowThreshold}%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                  <span>{profitMarginData.lowThreshold}% - {profitMarginData.highThreshold}%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span>&gt; {profitMarginData.highThreshold}%</span>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={updateProfitMarginMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateProfitMarginMutation.isPending ? "保存中..." : "保存設定"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}