import { MobileMenuTrigger } from "@/components/layout/sidebar";

export default function Header() {
  return (
    <header className="bg-card shadow-sm border-b border-border px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* 手機版選單按鈕 */}
          <MobileMenuTrigger />
          
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">
              <span className="lg:hidden">烘焙管理</span>
              <span className="hidden lg:inline">烘焙成本管理系統</span>
            </h2>
            <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">
              專業烘焙成本計算與管理平台
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
          {/* 同步狀態指示器 */}
          <div className="flex items-center text-green-600 text-xs lg:text-sm">
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full mr-1 lg:mr-2 animate-pulse"></div>
            <span className="hidden sm:inline">已同步</span>
            <span className="sm:hidden">☁️</span>
          </div>
        </div>
      </div>
    </header>
  );
}
