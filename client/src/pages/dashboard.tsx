import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Boxes, Receipt, ShoppingCart, DollarSign, Plus } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            <span className="sm:hidden">儀表板</span>
            <span className="hidden sm:inline">總覽儀表板</span>
          </h2>
          <p className="text-muted-foreground">
            <span className="sm:hidden">掌握關鍵指標</span>
            <span className="hidden sm:inline">掌握您的烘焙事業關鍵指標</span>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <div className="flex flex-col space-y-2">
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">
            <span className="sm:hidden">儀表板</span>
            <span className="hidden sm:inline">總覽儀表板</span>
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground">
            <span className="sm:hidden">掌握關鍵指標</span>
            <span className="hidden sm:inline">掌握您的管理系統關鍵指標</span>
          </p>
          <h1 className="text-2xl lg:text-4xl font-script text-primary">PiSet Management System</h1>
        </div>
      </div>
      
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/materials')}>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-full bg-primary/10 mr-3 lg:mr-4">
                <Boxes className="text-primary h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">原料總數</p>
                <p className="text-lg lg:text-2xl font-bold text-foreground">
                  {(stats as any)?.materialsCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/recipes')}>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-full bg-orange-100 mr-3 lg:mr-4">
                <Receipt className="text-orange-600 h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">配方總數</p>
                <p className="text-lg lg:text-2xl font-bold text-foreground">
                  {(stats as any)?.recipesCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/products')}>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-full bg-green-100 mr-3 lg:mr-4">
                <ShoppingCart className="text-green-600 h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">商品總數</p>
                <p className="text-lg lg:text-2xl font-bold text-foreground">
                  {(stats as any)?.productsCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-full bg-yellow-100 mr-3 lg:mr-4">
                <DollarSign className="text-yellow-600 h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">平均利潤率</p>
                <p className="text-lg lg:text-2xl font-bold text-foreground">
                  {(stats as any)?.averageProfitMargin ? `${(stats as any).averageProfitMargin.toFixed(1)}%` : "0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/materials">
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center">
                  <Plus className="text-primary mr-3 h-4 w-4" />
                  <span>新增原料</span>
                </div>
              </Button>
            </Link>
            
            <Link href="/recipes">
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center">
                  <Plus className="text-orange-600 mr-3 h-4 w-4" />
                  <span>新增配方</span>
                </div>
              </Button>
            </Link>
            
            <Link href="/products">
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center">
                  <Plus className="text-green-600 mr-3 h-4 w-4" />
                  <span>新增商品</span>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>系統狀態</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-green-800">雲端同步</p>
                <p className="text-sm text-green-600">資料已同步至雲端</p>
              </div>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="font-medium text-blue-800">系統版本</p>
                <p className="text-sm text-blue-600">烘焙成本管理系統 v1.0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
