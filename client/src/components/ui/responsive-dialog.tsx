import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

// 簡化版響應式對話框元件
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // 手機版：全螢幕
          "w-full h-full max-w-none max-h-none p-0",
          "left-0 top-0 translate-x-0 translate-y-0",
          // 桌面版：保持原有行為  
          "md:w-auto md:h-auto md:max-w-5xl md:max-h-[90vh]",
          "md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%]",
          "md:rounded-lg md:p-6",
          // 佈局
          footer ? "flex flex-col" : "",
          className
        )}
      >
        {/* 頭部 */}
        <div className="p-4 md:p-6 border-b md:border-b-0">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        </div>
        
        {/* 主體內容 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
        
        {/* 底部操作區 */}
        {footer && (
          <div className="border-t bg-background p-4 md:p-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 單獨的響應式對話框內容元件供自定義使用
export function ResponsiveDialogContent({ 
  children, 
  className,
  ...props 
}: React.ComponentPropsWithoutRef<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        // 手機版：全螢幕
        "w-full h-full max-w-none max-h-none p-0",
        "left-0 top-0 translate-x-0 translate-y-0",
        // 桌面版：保持原有行為
        "md:w-auto md:h-auto md:max-w-5xl md:max-h-[90vh]",
        "md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%]",
        "md:rounded-lg md:p-6",
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}