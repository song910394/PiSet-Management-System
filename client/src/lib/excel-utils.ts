import * as XLSX from "xlsx";

export interface ExcelImportResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export function readExcelFile(file: File): Promise<ExcelImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve({
          success: true,
          data: jsonData,
        });
      } catch (error) {
        resolve({
          success: false,
          error: "檔案格式錯誤，請確認為有效的 Excel 檔案",
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: "檔案讀取失敗",
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function exportToExcel(data: any[], filename: string, sheetName: string = "Sheet1") {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 設定欄寬
    const columnWidths = Object.keys(data[0] || {}).map(() => ({ wch: 15 }));
    worksheet['!cols'] = columnWidths;
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error("Export error:", error);
    return false;
  }
}

export function downloadBackup(backupData: any) {
  try {
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `烘焙成本管理系統備份-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("Backup download error:", error);
    return false;
  }
}
