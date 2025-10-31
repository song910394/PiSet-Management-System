import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  ShoppingCart,
  Gift,
  Package,
  Apple,
  Calculator,
  Database,
  Croissant as Bread,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  {
    name: "儀表板",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "原料",
    href: "/materials",
    icon: Boxes,
  },
  {
    name: "配方",
    href: "/recipes",
    icon: Receipt,
  },
  {
    name: "商品",
    href: "/products",
    icon: ShoppingCart,
  },
  {
    name: "客製商品",
    href: "/custom-products",
    icon: Gift,
  },
  {
    name: "包材",
    href: "/packaging",
    icon: Package,
  },
  {
    name: "營養",
    href: "/nutrition",
    icon: Apple,
  },
  {
    name: "營養表",
    href: "/nutrition-tables",
    icon: Calculator,
  },
  {
    name: "標示",
    href: "/nutrition-labels",
    icon: Database,
  },
];

const systemNavigation = [
  {
    name: "備份",
    href: "/backup",
    icon: Database,
  },
  {
    name: "設定",
    href: "/settings",
    icon: Menu,
  },
];

// 側邊欄內容組件
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Logo 和標題 */}
      <div className="p-4 lg:p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary rounded-lg flex items-center justify-center">
            <Bread className="text-primary-foreground h-4 w-4 lg:h-6 lg:w-6" />
          </div>
          <div>
            <h1 className="text-sm lg:text-lg font-bold text-foreground">PiSet管理系統</h1>
          </div>
        </div>
      </div>

      {/* 導航選單 */}
      <nav className="flex-1 p-3 lg:p-4 space-y-2 overflow-y-auto">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            主要功能
          </h3>
          
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={onNavigate}
                >
                  <Icon className="mr-3 h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="pt-4 space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            系統功能
          </h3>
          
          {systemNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={onNavigate}
                >
                  <Icon className="mr-3 h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 雲端同步狀態 */}
      <div className="p-3 lg:p-4 border-t border-border">
        <div className="flex items-center text-xs lg:text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
          <span className="truncate">已同步</span>
          <span className="ml-auto">☁️</span>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <div className="hidden lg:block w-64 bg-card shadow-lg border-r">
      <SidebarContent />
    </div>
  );
}

// 導出手機版選單觸發器供Header使用
export function MobileMenuTrigger() {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" data-testid="button-mobile-menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
