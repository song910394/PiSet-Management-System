import { createCanvas, registerFont } from 'canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from "xlsx";

export interface NutritionData {
  name: string;
  servingSize: string;
  servingsPerPackage: string;
  perServing: {
    calories: number;
    protein: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    carbohydrates: number;
    sugar: number;
    sodium: number;
  };
  per100g: {
    calories: number;
    protein: number;
    fat: number;
    saturatedFat: number;
    transFat: number;
    carbohydrates: number;
    sugar: number;
    sodium: number;
  };
}

export interface LabelSize {
  width: number;
  height: number;
  unit: 'mm' | 'px';
}

export class NutritionLabelGenerator {
  private defaultSize: LabelSize = { width: 200, height: 100, unit: 'mm' };

  // 將mm轉換為px (300 DPI)
  private mmToPx(mm: number): number {
    return Math.round(mm * 11.811); // 300 DPI: 1mm = 11.811px
  }

  // 將mm轉換為PDF點 (72 DPI)
  private mmToPt(mm: number): number {
    return mm * 2.834645669; // 1mm = 2.834645669pt
  }

  // 生成PDF格式標籤
  async generatePDF(nutrition: NutritionData, size: LabelSize = this.defaultSize): Promise<Buffer> {
    const widthPt = size.unit === 'mm' ? this.mmToPt(size.width) : size.width * 0.75;
    const heightPt = size.unit === 'mm' ? this.mmToPt(size.height) : size.height * 0.75;
    
    const pdf = new jsPDF({
      format: [widthPt, heightPt],
      unit: 'pt'
    });
    
    // 設置字體（使用內建字體以避免中文問題）
    pdf.setFont('helvetica');
    
    // 標題
    pdf.setFontSize(16);
    pdf.text('Nutrition Facts / 營養標示', widthPt / 2, 30, { align: 'center' });
    
    // 產品名稱
    pdf.setFontSize(14);
    pdf.text(nutrition.name, widthPt / 2, 50, { align: 'center' });
    
    // 份量資訊
    pdf.setFontSize(10);
    pdf.text(`Per Serving / 每份：${nutrition.servingSize}g`, 10, 70);
    pdf.text(`Servings per package / 本包裝含：${nutrition.servingsPerPackage}份`, 10, 85);
    
    // 表格標題
    pdf.setFontSize(8);
    pdf.text('Nutrition / 營養成分', 10, 105);
    pdf.text('Per Serving / 每份', widthPt * 0.5, 105);
    pdf.text('Per 100g / 每100公克', widthPt * 0.75, 105);
    
    // 營養成分數據
    const startY = 120;
    const lineHeight = 12;
    const nutritionData = [
      ['Calories / 熱量', `${Math.round(nutrition.perServing.calories)} kcal / 大卡`, `${Math.round(nutrition.per100g.calories)} kcal / 大卡`],
      ['Protein / 蛋白質', `${nutrition.perServing.protein.toFixed(1)} g / 公克`, `${nutrition.per100g.protein.toFixed(1)} g / 公克`],
      ['Fat / 脂肪', `${nutrition.perServing.fat.toFixed(1)} g / 公克`, `${nutrition.per100g.fat.toFixed(1)} g / 公克`],
      ['  Saturated Fat / 飽和脂肪', `${nutrition.perServing.saturatedFat.toFixed(1)} g / 公克`, `${nutrition.per100g.saturatedFat.toFixed(1)} g / 公克`],
      ['  Trans Fat / 反式脂肪', `${nutrition.perServing.transFat.toFixed(1)} g / 公克`, `${nutrition.per100g.transFat.toFixed(1)} g / 公克`],
      ['Carbohydrates / 碳水化合物', `${nutrition.perServing.carbohydrates.toFixed(1)} g / 公克`, `${nutrition.per100g.carbohydrates.toFixed(1)} g / 公克`],
      ['  Sugar / 糖', `${nutrition.perServing.sugar.toFixed(1)} g / 公克`, `${nutrition.per100g.sugar.toFixed(1)} g / 公克`],
      ['Sodium / 鈉', `${Math.round(nutrition.perServing.sodium)} mg / 毫克`, `${Math.round(nutrition.per100g.sodium)} mg / 毫克`]
    ];
    
    nutritionData.forEach((row, index) => {
      const y = startY + (index * lineHeight);
      pdf.setFontSize(7);
      pdf.text(row[0], 10, y);
      pdf.text(row[1], widthPt * 0.5, y);
      pdf.text(row[2], widthPt * 0.75, y);
    });
    
    // 邊框
    pdf.setLineWidth(1);
    pdf.rect(5, 5, widthPt - 10, heightPt - 10);
    
    return Buffer.from(pdf.output('arraybuffer'));
  }

  // 生成PNG格式標籤
  async generatePNG(nutrition: NutritionData, size: LabelSize = this.defaultSize): Promise<Buffer> {
    const widthPx = size.unit === 'mm' ? this.mmToPx(size.width) : size.width;
    const heightPx = size.unit === 'mm' ? this.mmToPx(size.height) : size.height;
    
    const canvas = createCanvas(widthPx, heightPx);
    const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    
    // 邊框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, widthPx - 20, heightPx - 20);
    
    // 設置字體顏色
    ctx.fillStyle = '#000000';
    
    // 標題
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nutrition Facts', widthPx / 2, 50);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('營養標示', widthPx / 2, 70);
    
    // 產品名稱
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(nutrition.name, widthPx / 2, 100);
    
    // 份量資訊
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Per Serving / 每份：${nutrition.servingSize}g`, 20, 130);
    ctx.fillText(`Servings per package / 本包裝含：${nutrition.servingsPerPackage}份`, 20, 150);
    
    // 表格標題
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Nutrition / 營養成分', 20, 180);
    ctx.textAlign = 'center';
    ctx.fillText('Per Serving / 每份', widthPx * 0.55, 180);
    ctx.fillText('Per 100g / 每100公克', widthPx * 0.8, 180);
    
    // 營養成分數據
    const startY = 200;
    const lineHeight = 16;
    const nutritionData = [
      ['Calories / 熱量', `${Math.round(nutrition.perServing.calories)}`, `${Math.round(nutrition.per100g.calories)}`],
      ['Protein / 蛋白質', `${nutrition.perServing.protein.toFixed(1)}g`, `${nutrition.per100g.protein.toFixed(1)}g`],
      ['Fat / 脂肪', `${nutrition.perServing.fat.toFixed(1)}g`, `${nutrition.per100g.fat.toFixed(1)}g`],
      ['  Saturated / 飽和', `${nutrition.perServing.saturatedFat.toFixed(1)}g`, `${nutrition.per100g.saturatedFat.toFixed(1)}g`],
      ['  Trans / 反式', `${nutrition.perServing.transFat.toFixed(1)}g`, `${nutrition.per100g.transFat.toFixed(1)}g`],
      ['Carbs / 碳水化合物', `${nutrition.perServing.carbohydrates.toFixed(1)}g`, `${nutrition.per100g.carbohydrates.toFixed(1)}g`],
      ['  Sugar / 糖', `${nutrition.perServing.sugar.toFixed(1)}g`, `${nutrition.per100g.sugar.toFixed(1)}g`],
      ['Sodium / 鈉', `${Math.round(nutrition.perServing.sodium)}mg`, `${Math.round(nutrition.per100g.sodium)}mg`]
    ];
    
    ctx.font = '9px sans-serif';
    nutritionData.forEach((row, index) => {
      const y = startY + (index * lineHeight);
      ctx.textAlign = 'left';
      ctx.fillText(row[0], 20, y);
      ctx.textAlign = 'center';
      ctx.fillText(row[1], widthPx * 0.55, y);
      ctx.fillText(row[2], widthPx * 0.8, y);
    });
    
    return canvas.toBuffer('image/png');
  }

  // 生成JPG格式標籤
  async generateJPG(nutrition: NutritionData, size: LabelSize = this.defaultSize): Promise<Buffer> {
    const widthPx = size.unit === 'mm' ? this.mmToPx(size.width) : size.width;
    const heightPx = size.unit === 'mm' ? this.mmToPx(size.height) : size.height;
    
    const canvas = createCanvas(widthPx, heightPx);
    const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    
    // 邊框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, widthPx - 20, heightPx - 20);
    
    // 設置字體顏色
    ctx.fillStyle = '#000000';
    
    // 標題
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nutrition Facts', widthPx / 2, 50);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('營養標示', widthPx / 2, 70);
    
    // 產品名稱
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(nutrition.name, widthPx / 2, 100);
    
    // 份量資訊
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Per Serving / 每份：${nutrition.servingSize}g`, 20, 130);
    ctx.fillText(`Servings per package / 本包裝含：${nutrition.servingsPerPackage}份`, 20, 150);
    
    // 表格標題
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Nutrition / 營養成分', 20, 180);
    ctx.textAlign = 'center';
    ctx.fillText('Per Serving / 每份', widthPx * 0.55, 180);
    ctx.fillText('Per 100g / 每100公克', widthPx * 0.8, 180);
    
    // 營養成分數據
    const startY = 200;
    const lineHeight = 16;
    const nutritionData = [
      ['Calories / 熱量', `${Math.round(nutrition.perServing.calories)}`, `${Math.round(nutrition.per100g.calories)}`],
      ['Protein / 蛋白質', `${nutrition.perServing.protein.toFixed(1)}g`, `${nutrition.per100g.protein.toFixed(1)}g`],
      ['Fat / 脂肪', `${nutrition.perServing.fat.toFixed(1)}g`, `${nutrition.per100g.fat.toFixed(1)}g`],
      ['  Saturated / 飽和', `${nutrition.perServing.saturatedFat.toFixed(1)}g`, `${nutrition.per100g.saturatedFat.toFixed(1)}g`],
      ['  Trans / 反式', `${nutrition.perServing.transFat.toFixed(1)}g`, `${nutrition.per100g.transFat.toFixed(1)}g`],
      ['Carbs / 碳水化合物', `${nutrition.perServing.carbohydrates.toFixed(1)}g`, `${nutrition.per100g.carbohydrates.toFixed(1)}g`],
      ['  Sugar / 糖', `${nutrition.perServing.sugar.toFixed(1)}g`, `${nutrition.per100g.sugar.toFixed(1)}g`],
      ['Sodium / 鈉', `${Math.round(nutrition.perServing.sodium)}mg`, `${Math.round(nutrition.per100g.sodium)}mg`]
    ];
    
    ctx.font = '9px sans-serif';
    nutritionData.forEach((row, index) => {
      const y = startY + (index * lineHeight);
      ctx.textAlign = 'left';
      ctx.fillText(row[0], 20, y);
      ctx.textAlign = 'center';
      ctx.fillText(row[1], widthPx * 0.55, y);
      ctx.fillText(row[2], widthPx * 0.8, y);
    });
    
    return canvas.toBuffer('image/jpeg', { quality: 0.95 });
  }

  // 生成所有格式
  async generateAllFormats(nutrition: NutritionData, size: LabelSize = this.defaultSize): Promise<{
    pdf: Buffer;
    png: Buffer;
    jpg: Buffer;
  }> {
    const [pdf, png, jpg] = await Promise.all([
      this.generatePDF(nutrition, size),
      this.generatePNG(nutrition, size),
      this.generateJPG(nutrition, size)
    ]);

    return { pdf, png, jpg };
  }
}

// 新增Excel格式生成功能
export async function generateNutritionLabelExcel(nutritionData: any): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  
  const nutrition = nutritionData.calculatedNutrition;
  
  // 營養標示資料（繁體中文格式）
  const labelData = [
    ['營養標示', '', '', ''],
    ['產品名稱', nutritionData.name, '', ''],
    ['每份重量', `${nutritionData.servingSize}公克`, '', ''],
    ['本包裝含', `${nutritionData.servingsPerPackage}份`, '', ''],
    ['', '', '', ''],
    ['', '每份', '每100公克', '每日參考值百分比'],
    ['熱量', `${Math.round(nutrition?.perServing?.calories || 0)}大卡`, `${Math.round(nutrition?.per100g?.calories || 0)}大卡`, ''],
    ['蛋白質', `${Math.round(nutrition?.perServing?.protein || 0)}公克`, `${Math.round(nutrition?.per100g?.protein || 0)}公克`, ''],
    ['脂肪', `${Math.round(nutrition?.perServing?.fat || 0)}公克`, `${Math.round(nutrition?.per100g?.fat || 0)}公克`, ''],
    ['　飽和脂肪', `${Math.round(nutrition?.perServing?.saturatedFat || 0)}公克`, `${Math.round(nutrition?.per100g?.saturatedFat || 0)}公克`, ''],
    ['　反式脂肪', `${Math.round(nutrition?.perServing?.transFat || 0)}公克`, `${Math.round(nutrition?.per100g?.transFat || 0)}公克`, ''],
    ['碳水化合物', `${Math.round(nutrition?.perServing?.carbohydrates || 0)}公克`, `${Math.round(nutrition?.per100g?.carbohydrates || 0)}公克`, ''],
    ['　糖', `${Math.round(nutrition?.perServing?.sugar || 0)}公克`, `${Math.round(nutrition?.per100g?.sugar || 0)}公克`, ''],
    ['鈉', `${Math.round(nutrition?.perServing?.sodium || 0)}毫克`, `${Math.round(nutrition?.per100g?.sodium || 0)}毫克`, ''],
    ['', '', '', ''],
    ['※ 參考值：依據衛生福利部「國人膳食營養素參考攝取量」第八版（民國109年）', '', '', ''],
    ['※ 熱量2000大卡飲食為基準', '', '', ''],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(labelData);
  
  // 設定欄寬
  worksheet['!cols'] = [
    { width: 15 },  // A欄 - 項目名稱
    { width: 12 },  // B欄 - 每份數值
    { width: 12 },  // C欄 - 每100g數值
    { width: 15 }   // D欄 - 每日參考值
  ];

  // 合併儲存格
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // 營養標示標題
    { s: { r: 15, c: 0 }, e: { r: 15, c: 3 } }, // 參考值說明1
    { s: { r: 16, c: 0 }, e: { r: 16, c: 3 } }  // 參考值說明2
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '營養標示');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}