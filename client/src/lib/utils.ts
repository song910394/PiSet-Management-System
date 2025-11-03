import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 格式化數字顯示：保留小數點後1位，如為0則省略
export function formatNumber(value: number | string | undefined | null): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // 如果是整數，直接顯示
  if (num % 1 === 0) {
    return num.toString();
  }
  
  // 保留1位小數
  return num.toFixed(1);
}
