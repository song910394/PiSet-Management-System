import { storage } from "./storage";
import * as fs from "fs/promises";
import * as path from "path";
import { log } from "./vite";

// 備份目錄設定
const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUP_FILES = 10;

// 追蹤每日首次登入的檔案
const DAILY_LOGIN_TRACKER = path.join(process.cwd(), "daily-login-tracker.json");

// 載入每日登入追蹤記錄
async function loadDailyLoginTracker(): Promise<{ lastLoginDate?: string }> {
  try {
    const data = await fs.readFile(DAILY_LOGIN_TRACKER, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// 保存每日登入追蹤記錄
async function saveDailyLoginTracker(data: { lastLoginDate: string }): Promise<void> {
  await fs.writeFile(DAILY_LOGIN_TRACKER, JSON.stringify(data, null, 2), 'utf8');
}

// 檢查是否為今日首次登入（使用台灣時區 UTC+8）
export async function isFirstLoginToday(): Promise<boolean> {
  const tracker = await loadDailyLoginTracker();
  
  // 取得台灣時區的今日日期（UTC+8）
  const taiwanOffset = 8 * 60; // 台灣時區偏移量（分鐘）
  const now = new Date();
  const taiwanTime = new Date(now.getTime() + (taiwanOffset + now.getTimezoneOffset()) * 60000);
  const today = taiwanTime.toISOString().split('T')[0]; // YYYY-MM-DD
  
  if (tracker.lastLoginDate !== today) {
    await saveDailyLoginTracker({ lastLoginDate: today });
    return true;
  }
  
  return false;
}

// 確保備份目錄存在
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    log(`Failed to create backup directory: ${error}`, "backup");
  }
}

// 生成備份檔案名稱
function generateBackupFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `backup-${dateStr}-${timeStr}.json`;
}

// 創建完整系統備份
export async function createFullBackup(): Promise<string> {
  try {
    await ensureBackupDir();
    
    log("Starting full system backup...", "backup");
    
    // 獲取所有系統數據
    const [materials, recipes, packaging, products, customProducts, nutritionFacts, taiwanNutrition, nutritionLabels, nutritionLabelTemplates] = await Promise.all([
      storage.getMaterials(),
      storage.getRecipes(), 
      storage.getPackaging(),
      storage.getProducts(),
      storage.getCustomProducts(),
      storage.getNutritionFacts(),
      storage.getTaiwanNutritionDatabase(),
      storage.getNutritionLabels(),
      storage.getNutritionLabelTemplates()
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      description: "自動系統備份",
      data: {
        materials,
        recipes,
        packaging,
        products,
        customProducts,
        nutritionFacts,
        taiwanNutrition,
        nutritionLabels,
        nutritionLabelTemplates
      },
      statistics: {
        materialsCount: materials.length,
        recipesCount: recipes.length,
        packagingCount: packaging.length,
        productsCount: products.length,
        customProductsCount: customProducts.length,
        nutritionFactsCount: nutritionFacts.length,
        taiwanNutritionCount: taiwanNutrition.length,
        nutritionLabelsCount: nutritionLabels.length,
        nutritionLabelTemplatesCount: nutritionLabelTemplates.length
      }
    };

    const filename = generateBackupFilename();
    const filepath = path.join(BACKUP_DIR, filename);
    
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    
    log(`Backup created successfully: ${filename}`, "backup");
    log(`Backup contains: ${materials.length} 原料, ${recipes.length} 配方, ${packaging.length} 包裝, ${products.length} 商品, ${customProducts.length} 客制商品, ${nutritionLabels.length} 營養標示`, "backup");
    
    return filepath;
  } catch (error) {
    log(`Backup creation failed: ${error}`, "backup");
    throw new Error(`備份創建失敗: ${error}`);
  }
}

// 清理舊備份檔案，保留最近10個
export async function cleanOldBackups(): Promise<void> {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
    
    if (backupFiles.length <= MAX_BACKUP_FILES) {
      log(`Found ${backupFiles.length} backup files, no cleanup needed`, "backup");
      return;
    }

    // 獲取檔案的修改時間並排序
    const filesWithStats = await Promise.all(
      backupFiles.map(async (file) => {
        try {
          const filepath = path.join(BACKUP_DIR, file);
          const stats = await fs.stat(filepath);
          return { file, filepath, mtime: stats.mtime };
        } catch (error) {
          return null;
        }
      })
    );

    const validFiles = filesWithStats
      .filter(item => item !== null)
      .sort((a, b) => b!.mtime.getTime() - a!.mtime.getTime());

    // 保留最新的 MAX_BACKUP_FILES 個檔案，刪除其餘的
    const filesToDelete = validFiles.slice(MAX_BACKUP_FILES);
    
    for (const fileInfo of filesToDelete) {
      try {
        await fs.unlink(fileInfo!.filepath);
        log(`Deleted old backup: ${fileInfo!.file}`, "backup");
      } catch (error) {
        log(`Failed to delete backup ${fileInfo!.file}: ${error}`, "backup");
      }
    }

    if (filesToDelete.length > 0) {
      log(`Cleaned up ${filesToDelete.length} old backup files, keeping ${MAX_BACKUP_FILES} most recent`, "backup");
    }
  } catch (error) {
    log(`Backup cleanup failed: ${error}`, "backup");
  }
}

// 獲取可用備份清單
export async function getAvailableBackups(): Promise<Array<{
  filename: string;
  filepath: string;
  timestamp: string;
  size: number;
  description?: string;
}>> {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
    
    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const filepath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filepath);
        
        try {
          // 讀取備份檔案的元數據
          const content = await fs.readFile(filepath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            filename: file,
            filepath,
            timestamp: data.timestamp || stats.mtime.toISOString(),
            size: stats.size,
            description: data.description || "系統備份"
          };
        } catch {
          // 如果無法讀取檔案內容，使用檔案系統資訊
          return {
            filename: file,
            filepath,
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
            description: "系統備份"
          };
        }
      })
    );
    
    // 按時間戳排序（最新的在前）
    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    log(`Failed to get backup list: ${error}`, "backup");
    return [];
  }
}

// 從備份檔案還原系統
export async function restoreFromBackup(backupPath: string): Promise<{
  success: boolean;
  message: string;
  restored: {
    materials: number;
    recipes: number;
    packaging: number;
    products: number;
    customProducts: number;
    nutritionFacts: number;
  };
}> {
  try {
    log(`Starting restore from backup: ${backupPath}`, "backup");
    
    // 讀取備份檔案
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    
    if (!backupData.data) {
      throw new Error("無效的備份檔案格式");
    }

    const { materials = [], recipes = [], packaging = [], products = [], customProducts = [], nutritionFacts = [] } = backupData.data;
    
    let restoredCounts = {
      materials: 0,
      recipes: 0,
      packaging: 0,
      products: 0,
      customProducts: 0,
      nutritionFacts: 0
    };

    // 還原原料
    log("Restoring materials...", "backup");
    for (const material of materials) {
      try {
        const existingMaterials = await storage.getMaterials(material.name);
        const existing = existingMaterials.find(m => m.name === material.name);
        
        if (existing) {
          await storage.updateMaterial(existing.id, {
            category: material.category,
            pricePerGram: material.pricePerGram,
            notes: material.notes
          });
        } else {
          await storage.createMaterial({
            name: material.name,
            category: material.category,
            pricePerGram: material.pricePerGram,
            notes: material.notes
          });
        }
        restoredCounts.materials++;
      } catch (error) {
        log(`Failed to restore material ${material.name}: ${error}`, "backup");
      }
    }

    // 還原包裝
    log("Restoring packaging...", "backup");
    for (const pack of packaging) {
      try {
        const existingPackaging = await storage.getPackaging(pack.name);
        const existing = existingPackaging.find(p => p.name === pack.name);
        
        if (existing) {
          await storage.updatePackaging(existing.id, {
            type: pack.type,
            unitCost: pack.unitCost,
            notes: pack.notes
          });
        } else {
          await storage.createPackaging({
            name: pack.name,
            type: pack.type,
            unitCost: pack.unitCost,
            notes: pack.notes
          });
        }
        restoredCounts.packaging++;
      } catch (error) {
        log(`Failed to restore packaging ${pack.name}: ${error}`, "backup");
      }
    }

    // 還原配方
    log("Restoring recipes...", "backup");
    for (const recipe of recipes) {
      try {
        const existingRecipes = await storage.getRecipes(recipe.name);
        const existing = existingRecipes.find(r => r.name === recipe.name);
        
        const recipeData = {
          name: recipe.name,
          category: recipe.category,
          description: recipe.description,
          totalPortions: recipe.totalPortions,
          totalWeight: recipe.totalWeight
        };

        // 處理配方原料
        const ingredients = [];
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          for (const ingredient of recipe.ingredients) {
            const materials = await storage.getMaterials(ingredient.material.name);
            const material = materials.find(m => m.name === ingredient.material.name);
            if (material) {
              ingredients.push({
                materialId: material.id,
                recipeId: 0, // 將在創建配方後設置
                quantity: String(ingredient.quantity)
              });
            }
          }
        }

        if (existing) {
          await storage.updateRecipe(existing.id, recipeData, ingredients);
        } else {
          await storage.createRecipe(recipeData, ingredients);
        }
        restoredCounts.recipes++;
      } catch (error) {
        log(`Failed to restore recipe ${recipe.name}: ${error}`, "backup");
      }
    }

    // 還原商品
    log("Restoring products...", "backup");
    for (const product of products) {
      try {
        const existingProducts = await storage.getProducts(product.name);
        const existing = existingProducts.find(p => p.name === product.name);
        
        const productData = {
          name: product.name,
          category: product.category,
          sellingPrice: product.sellingPrice,
          description: product.description
        };

        // 處理商品配方
        const productRecipes = [];
        if (product.recipes && product.recipes.length > 0) {
          for (const pr of product.recipes) {
            const recipes = await storage.getRecipes(pr.recipe.name);
            const recipe = recipes.find(r => r.name === pr.recipe.name);
            if (recipe) {
              productRecipes.push({
                recipeId: recipe.id,
                quantity: String(pr.quantity),
                productId: 0, // 將在創建產品後設置
                unit: String(pr.unit)
              });
            }
          }
        }

        // 處理商品包裝
        const productPackaging = [];
        if (product.packaging && product.packaging.length > 0) {
          for (const pp of product.packaging) {
            const packaging = await storage.getPackaging(pp.packaging.name);
            const pack = packaging.find(p => p.name === pp.packaging.name);
            if (pack) {
              productPackaging.push({
                packagingId: pack.id,
                quantity: Number(pp.quantity),
                productId: 0 // 將在創建產品後設置
              });
            }
          }
        }

        if (existing) {
          await storage.updateProduct(existing.id, productData, productRecipes, productPackaging);
        } else {
          await storage.createProduct(productData, productRecipes, productPackaging);
        }
        restoredCounts.products++;
      } catch (error) {
        log(`Failed to restore product ${product.name}: ${error}`, "backup");
      }
    }

    // 還原客制商品
    log("Restoring custom products...", "backup");
    for (const customProduct of customProducts) {
      try {
        const existingCustomProducts = await storage.getCustomProducts(customProduct.name);
        const existing = existingCustomProducts.find(cp => cp.name === customProduct.name);
        
        const customProductData = {
          name: customProduct.name,
          category: customProduct.category,
          sellingPrice: customProduct.sellingPrice,
          description: customProduct.description
        };

        // 處理客制商品項目（包含的商品）
        const items = [];
        if (customProduct.items && customProduct.items.length > 0) {
          for (const item of customProduct.items) {
            const products = await storage.getProducts(item.product.name);
            const product = products.find(p => p.name === item.product.name);
            if (product) {
              items.push({
                productId: product.id,
                quantity: String(item.quantity)
              });
            }
          }
        }

        if (existing) {
          await storage.updateCustomProduct(existing.id, customProductData, items, []);
        } else {
          await storage.createCustomProduct(customProductData, items, []);
        }
        restoredCounts.customProducts++;
      } catch (error) {
        log(`Failed to restore custom product ${customProduct.name}: ${error}`, "backup");
      }
    }

    // 還原營養資料
    log("Restoring nutrition facts...", "backup");
    for (const nutrition of nutritionFacts) {
      try {
        if (!nutrition.nutritionFacts) continue;
        
        const materials = await storage.getMaterials(nutrition.name);
        const material = materials.find(m => m.name === nutrition.name);
        
        if (material) {
          const existing = await storage.getNutritionFactsForMaterial(material.id);
          const nutritionData = {
            materialId: material.id,
            calories: String(nutrition.nutritionFacts.calories || '0'),
            protein: String(nutrition.nutritionFacts.protein || '0'),
            fat: String(nutrition.nutritionFacts.fat || '0'),
            saturatedFat: String(nutrition.nutritionFacts.saturatedFat || '0'),
            transFat: String(nutrition.nutritionFacts.transFat || '0'),
            carbohydrates: String(nutrition.nutritionFacts.carbohydrates || '0'),
            sugar: String(nutrition.nutritionFacts.sugar || '0'),
            sodium: String(nutrition.nutritionFacts.sodium || '0')
          };
          
          if (existing) {
            await storage.updateNutritionFacts(existing.id, nutritionData);
          } else {
            await storage.createNutritionFacts(nutritionData);
          }
          restoredCounts.nutritionFacts++;
        }
      } catch (error) {
        log(`Failed to restore nutrition for ${nutrition.name}: ${error}`, "backup");
      }
    }

    const message = `還原完成：${restoredCounts.materials} 原料、${restoredCounts.recipes} 配方、${restoredCounts.packaging} 包裝、${restoredCounts.products} 商品、${restoredCounts.customProducts} 客制商品、${restoredCounts.nutritionFacts} 營養資料`;
    log(message, "backup");

    return {
      success: true,
      message,
      restored: restoredCounts
    };
  } catch (error) {
    const errorMessage = `還原失敗: ${error}`;
    log(errorMessage, "backup");
    return {
      success: false,
      message: errorMessage,
      restored: {
        materials: 0,
        recipes: 0,
        packaging: 0,
        products: 0,
        customProducts: 0,
        nutritionFacts: 0
      }
    };
  }
}

// 每日首次登入時自動備份（已移至登入API，無需定時任務）