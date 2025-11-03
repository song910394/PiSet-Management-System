import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertMaterialSchema,
  insertRecipeSchema,
  insertRecipeIngredientSchema,
  insertPackagingSchema,
  insertProductSchema,
  insertProductRecipeSchema,
  insertProductPackagingSchema,
  insertCustomProductSchema,
  insertCustomProductItemSchema,
  insertCustomProductPackagingSchema,
  insertNutritionFactsSchema,
  insertUserSettingsSchema,
  insertNutritionLabelTemplateSchema,
  insertNutritionLabelSchema,
  insertTaiwanNutritionDatabaseSchema,
  insertMaterialNutritionMappingSchema,
  type Material,
  type Recipe,
  type RecipeIngredient,
  type Packaging,
  type Product,
  type CustomProduct,
  type NutritionFacts,
  type UserSettings,
  type TaiwanNutritionDatabase,
  type MaterialNutritionMapping,
  type NutritionLabelTemplate,
  type NutritionLabel,
  type CalculatedNutrition,
} from "@shared/schema";
import { createFullBackup, getAvailableBackups, restoreFromBackup } from "./backup";
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { NutritionLabelGenerator, generateNutritionLabelExcel } from "./nutritionLabelGenerator";

// 使用者名稱常數
const ADMIN_USERNAME = 'admin';

// 預設設定
const DEFAULT_SETTINGS = {
  password: "admin",
  profitMargin: {
    lowThreshold: 20,
    highThreshold: 40
  }
};

// 當前設定快取（即時從資料庫載入）
let appSettings = DEFAULT_SETTINGS;

// 載入設定從資料庫
async function loadSettings(): Promise<void> {
  try {
    const userSettings = await storage.getUserSettings(ADMIN_USERNAME);
    if (userSettings) {
      // 從資料庫載入設定
      appSettings = {
        password: "admin", // 密碼不直接暴露，通過 passwordHash 驗證
        profitMargin: {
          lowThreshold: parseFloat(userSettings.profitMarginLow),
          highThreshold: parseFloat(userSettings.profitMarginHigh)
        }
      };
      console.log('Settings loaded from database successfully');
    } else {
      // 創建預設使用者設定
      const passwordHash = await bcrypt.hash(DEFAULT_SETTINGS.password, 10);
      await storage.createUserSettings({
        username: ADMIN_USERNAME,
        passwordHash,
        profitMarginLow: DEFAULT_SETTINGS.profitMargin.lowThreshold.toFixed(2),
        profitMarginHigh: DEFAULT_SETTINGS.profitMargin.highThreshold.toFixed(2)
      });
      console.log('Created default user settings in database');
    }
  } catch (error) {
    console.error('Failed to load settings from database:', error);
    console.log('Using default settings');
  }
}

// 儲存設定到資料庫（已移除，改為即時儲存）
async function saveSettings(): Promise<void> {
  // 此函數已廢棄，改為各API即時儲存到資料庫
  console.log('Settings are now saved immediately to database');
}

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // 載入應用設定
  await loadSettings();
  
  // Materials routes
  // Export route must come before :id route to avoid route conflicts
  app.get("/api/materials/export", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      
      if (!materials || materials.length === 0) {
        return res.status(404).json({ message: "沒有原料資料可匯出" });
      }

      const data = materials.map(material => ({
        "原料名稱": material.name,
        "分類": material.category,
        "每克單價": material.pricePerGram,
        "備註": material.notes || "",
        "購入金額": material.purchaseAmount || "",
        "購入重量": material.purchaseWeight || "",
        "管理費率": material.managementFeeRate || "",
        "購入時間": material.purchaseTime ? new Date(material.purchaseTime).toLocaleString('zh-TW') : "",
        "購入地點": material.purchaseLocation || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "原料清單");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      const filename = `materials-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Export error details:", error);
      res.status(500).json({ message: "獲取原料資料失敗" });
    }
  });

  app.get("/api/materials", async (req, res) => {
    try {
      const { search, category } = req.query;
      const materials = await storage.getMaterials(
        search as string,
        category as string
      );
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "獲取原料資料失敗" });
    }
  });

  app.get("/api/materials/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getMaterialHistory(Number(id));
      res.json(history);
    } catch (error) {
      console.error("Error fetching material history:", error);
      res.status(500).json({ message: "獲取原料履歷失敗" });
    }
  });

  app.get("/api/materials/:id/with-history", async (req, res) => {
    try {
      const { id } = req.params;
      const materialWithHistory = await storage.getMaterialWithHistory(Number(id));
      if (!materialWithHistory) {
        return res.status(404).json({ message: "原料不存在" });
      }
      res.json(materialWithHistory);
    } catch (error) {
      console.error("Error fetching material with history:", error);
      res.status(500).json({ message: "獲取原料詳細資料失敗" });
    }
  });

  app.get("/api/materials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const material = await storage.getMaterial(id);
      if (!material) {
        return res.status(404).json({ message: "原料不存在" });
      }
      res.json(material);
    } catch (error) {
      res.status(500).json({ message: "獲取原料資料失敗" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    try {
      // 移除詳細日誌，保持簡潔
      
      // 預處理請求資料，轉換時間格式
      const processedBody = {
        ...req.body,
        purchaseTime: req.body.purchaseTime ? new Date(req.body.purchaseTime) : null,
        purchaseAmount: req.body.purchaseAmount === "" ? null : req.body.purchaseAmount,
        purchaseWeight: req.body.purchaseWeight === "" ? null : req.body.purchaseWeight,
        managementFeeRate: req.body.managementFeeRate === "" ? null : req.body.managementFeeRate,
        purchaseLocation: req.body.purchaseLocation === "" ? null : req.body.purchaseLocation,
      };
      
      const materialData = insertMaterialSchema.parse(processedBody);
      // 資料驗證成功
      const material = await storage.createMaterial(materialData);
      res.status(201).json(material);
    } catch (error) {
      console.error("Material creation error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(400).json({ 
        message: "新增原料失敗，請檢查輸入資料",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/materials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // 更新請求
      
      // 預處理請求資料，轉換時間格式
      const processedBody = {
        ...req.body,
        purchaseTime: req.body.purchaseTime ? new Date(req.body.purchaseTime) : null,
        purchaseAmount: req.body.purchaseAmount === "" ? null : req.body.purchaseAmount,
        purchaseWeight: req.body.purchaseWeight === "" ? null : req.body.purchaseWeight,
        managementFeeRate: req.body.managementFeeRate === "" ? null : req.body.managementFeeRate,
        purchaseLocation: req.body.purchaseLocation === "" ? null : req.body.purchaseLocation,
      };
      
      const materialData = insertMaterialSchema.partial().parse(processedBody);
      // 更新資料驗證成功
      const material = await storage.updateMaterial(id, materialData);
      res.json(material);
    } catch (error) {
      console.error("Material update error:", error);
      res.status(400).json({ message: "更新原料失敗，請檢查輸入資料" });
    }
  });

  app.delete("/api/materials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Deleting material with ID:", id);
      await storage.deleteMaterial(id);
      res.json({ message: "原料已刪除" });
    } catch (error) {
      console.error("Delete material error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "刪除原料失敗" });
    }
  });

  // Batch delete materials
  app.delete("/api/materials", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "請提供要刪除的原料ID列表" });
      }

      let deletedCount = 0;
      for (const id of ids) {
        try {
          await storage.deleteMaterial(parseInt(id));
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete material ${id}:`, error);
        }
      }

      res.json({ 
        message: `成功刪除 ${deletedCount} 項原料`,
        deletedCount 
      });
    } catch (error) {
      console.error("Batch delete error:", error);
      res.status(500).json({ message: "批次刪除失敗" });
    }
  });

  // Materials import/export
  app.post("/api/materials/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;
      let updatedCount = 0;

      for (const row of data as any[]) {
        if (!row["原料名稱"] || !row["分類"] || !row["每克單價"]) continue;

        const materialData = {
          name: row["原料名稱"],
          category: row["分類"],
          pricePerGram: row["每克單價"].toString(),
          notes: row["備註"] || "",
          purchaseAmount: row["購入金額"] ? row["購入金額"].toString() : null,
          purchaseWeight: row["購入重量"] ? row["購入重量"].toString() : null,
          managementFeeRate: row["管理費率"] ? row["管理費率"].toString() : null,
          purchaseTime: row["購入時間"] ? new Date(row["購入時間"]) : null,
          purchaseLocation: row["購入地點"] || null,
        };

        try {
          // 檢查是否已存在同名原料
          const existingMaterials = await storage.getMaterials(materialData.name);
          const existing = existingMaterials.find(m => m.name === materialData.name);

          if (existing) {
            await storage.updateMaterial(existing.id, materialData);
            updatedCount++;
          } else {
            await storage.createMaterial(materialData);
            importedCount++;
          }
        } catch (error) {
          console.error("Import material error:", error);
        }
      }

      res.json({ 
        message: `匯入完成：新增 ${importedCount} 項，更新 ${updatedCount} 項原料`,
        imported: importedCount,
        updated: updatedCount
      });
    } catch (error) {
      res.status(500).json({ message: "匯入失敗，請檢查檔案格式" });
    }
  });



  // Recipes routes
  // Export route must come before :id route to avoid route conflicts
  app.get("/api/recipes/export", async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      const data = recipes.map(recipe => {
        // 格式化原料清單為「原料名稱1:數量,原料名稱2:數量,…」
        const ingredientsText = recipe.ingredients
          .filter(ing => parseFloat(ing.quantity) > 0) // 排除數量為0的原料
          .map(ing => `${ing.material.name}:${ing.quantity}`)
          .join(',');

        return {
          "配方名稱": recipe.name,
          "分類": recipe.category,
          "份量": recipe.totalPortions,
          "總重量": recipe.totalWeight,
          "原料清單": ingredientsText,
          "製作步驟": recipe.description || "",
          "總成本": recipe.totalCost || 0,
          "每份成本": recipe.costPerPortion || 0,
          "每公克成本": recipe.costPerGram || 0,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "配方清單");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      const filename = `recipes-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "匯出失敗" });
    }
  });

  app.get("/api/recipes", async (req, res) => {
    try {
      const { search, category } = req.query;
      const recipes = await storage.getRecipes(
        search as string,
        category as string
      );
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "獲取配方資料失敗" });
    }
  });

  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "配方不存在" });
      }
      res.json(recipe);
    } catch (error) {
      res.status(500).json({ message: "獲取配方資料失敗" });
    }
  });

  app.post("/api/recipes", async (req, res) => {
    try {
      // Handle both direct format and nested format
      const { recipe: nestedRecipe, ingredients = [] } = req.body;
      const recipeData = nestedRecipe || req.body;
      
      // Validate recipe data
      const recipe = insertRecipeSchema.parse(recipeData);
      
      // Transform and validate ingredients
      const parsedIngredients = ingredients
        .filter((ing: any) => ing.materialId && parseFloat(ing.quantity) > 0)
        .map((ing: any) => ({
          materialId: parseInt(ing.materialId),
          quantity: ing.quantity.toString(),
        }));
      
      const created = await storage.createRecipe(recipe, parsedIngredients);
      res.status(201).json(created);
    } catch (error) {
      console.error("Recipe creation error:", error);
      res.status(400).json({ message: "新增配方失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Handle both direct format and nested format
      const { recipe: nestedRecipe, ingredients } = req.body;
      const recipeData = nestedRecipe || req.body;
      
      const recipe = insertRecipeSchema.partial().parse(recipeData);
      const parsedIngredients = ingredients ? ingredients.map((ing: any) => ({
        materialId: parseInt(ing.materialId),
        quantity: ing.quantity.toString(),
      })) : undefined;
      
      const updated = await storage.updateRecipe(id, recipe, parsedIngredients);
      res.json(updated);
    } catch (error) {
      console.error("Recipe update error:", error);
      res.status(400).json({ message: "更新配方失敗，請檢查輸入資料" });
    }
  });

  app.delete("/api/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRecipe(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "刪除配方失敗" });
    }
  });

  // Recipes import/export
  app.post("/api/recipes/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // 取得所有材料數據來進行名稱匹配
      const materials = await storage.getMaterials();

      let importedCount = 0;
      let updatedCount = 0;

      for (const row of data as any[]) {
        if (!row["配方名稱"] || !row["分類"]) continue;

        const recipeData = {
          name: row["配方名稱"],
          category: row["分類"],
          totalPortions: parseInt(row["份量"] || "1"),
          totalWeight: (row["總重量"] || "100").toString(),
          description: row["製作步驟"] || row["備註"] || "",
        };

        // 解析原料清單
        const ingredients = [];
        const ingredientsText = row["原料清單"] || "";
        if (ingredientsText) {
          const ingredientPairs = ingredientsText.split(',').map((pair: string) => pair.trim());
          for (const pair of ingredientPairs) {
            const [materialName, quantity] = pair.split(':').map((s: string) => s.trim());
            if (materialName && quantity && parseFloat(quantity) > 0) {
              // 根據名稱找到對應的材料
              const material = materials.find((m: any) => m.name === materialName);
              if (material) {
                ingredients.push({
                  materialId: material.id,
                  recipeId: 0, // 將在創建配方後設置
                  quantity: quantity,
                });
              }
            }
          }
        }

        try {
          const existingRecipes = await storage.getRecipes(recipeData.name);
          const existing = existingRecipes.find(r => r.name === recipeData.name);

          if (existing) {
            await storage.updateRecipe(existing.id, recipeData, ingredients);
            updatedCount++;
          } else {
            await storage.createRecipe(recipeData, ingredients);
            importedCount++;
          }
        } catch (error) {
          console.error("Import recipe error:", error);
        }
      }

      res.json({ 
        message: `匯入完成：新增 ${importedCount} 項，更新 ${updatedCount} 項配方`,
        imported: importedCount,
        updated: updatedCount
      });
    } catch (error) {
      res.status(500).json({ message: "匯入失敗，請檢查檔案格式" });
    }
  });



  // Material Categories routes
  app.get("/api/material-categories", async (req, res) => {
    try {
      const categories = await storage.getMaterialCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get material categories error:', error);
      res.status(500).json({ message: "獲取原料分類失敗" });
    }
  });

  app.post("/api/material-categories", async (req, res) => {
    try {
      const { insertMaterialCategorySchema } = await import("@shared/schema");
      const categoryData = insertMaterialCategorySchema.parse(req.body);
      const category = await storage.createMaterialCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create material category error:', error);
      res.status(400).json({ message: "新增原料分類失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/material-categories/:id", async (req, res) => {
    try {
      const { insertMaterialCategorySchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const categoryData = insertMaterialCategorySchema.partial().parse(req.body);
      
      // 如果修改了分類名稱，需要同步更新所有原料
      if (categoryData.name) {
        const oldCategory = await storage.getMaterialCategoryById(id);
        if (oldCategory && oldCategory.name !== categoryData.name) {
          await storage.updateMaterialsCategory(oldCategory.name, categoryData.name);
        }
      }
      
      const category = await storage.updateMaterialCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error('Update material category error:', error);
      res.status(400).json({ message: "更新原料分類失敗" });
    }
  });

  app.delete("/api/material-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaterialCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete material category error:', error);
      res.status(500).json({ message: "刪除原料分類失敗" });
    }
  });

  app.post("/api/material-categories/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.reorderMaterialCategories(orderUpdates);
      res.json({ message: "原料分類排序已更新" });
    } catch (error) {
      console.error("Error updating material categories order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/material-categories/init", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      const existingCategories = await storage.getMaterialCategories();
      const existingCategoryNames = new Set(existingCategories.map(c => c.name));
      
      const uniqueCategories = [...new Set(materials.map(m => m.category))];
      let addedCount = 0;
      
      for (let i = 0; i < uniqueCategories.length; i++) {
        const categoryName = uniqueCategories[i];
        if (!existingCategoryNames.has(categoryName)) {
          await storage.createMaterialCategory({ name: categoryName, sortOrder: i });
          addedCount++;
        }
      }
      
      res.json({ message: `已初始化 ${addedCount} 個原料分類`, added: addedCount });
    } catch (error) {
      console.error("Error initializing material categories:", error);
      res.status(500).json({ message: "初始化分類失敗" });
    }
  });

  // Recipe Categories routes
  app.get("/api/recipe-categories", async (req, res) => {
    try {
      const categories = await storage.getRecipeCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get recipe categories error:', error);
      res.status(500).json({ message: "獲取配方分類失敗" });
    }
  });

  app.post("/api/recipe-categories", async (req, res) => {
    try {
      const { insertRecipeCategorySchema } = await import("@shared/schema");
      const categoryData = insertRecipeCategorySchema.parse(req.body);
      const category = await storage.createRecipeCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create recipe category error:', error);
      res.status(400).json({ message: "新增配方分類失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/recipe-categories/:id", async (req, res) => {
    try {
      const { insertRecipeCategorySchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const categoryData = insertRecipeCategorySchema.partial().parse(req.body);
      
      // 如果修改了分類名稱，需要同步更新所有配方
      if (categoryData.name) {
        const oldCategory = await storage.getRecipeCategoryById(id);
        if (oldCategory && oldCategory.name !== categoryData.name) {
          await storage.updateRecipesCategory(oldCategory.name, categoryData.name);
        }
      }
      
      const category = await storage.updateRecipeCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error('Update recipe category error:', error);
      res.status(400).json({ message: "更新配方分類失敗" });
    }
  });

  app.delete("/api/recipe-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRecipeCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete recipe category error:', error);
      res.status(500).json({ message: "刪除配方分類失敗" });
    }
  });

  app.post("/api/recipe-categories/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.reorderRecipeCategories(orderUpdates);
      res.json({ message: "配方分類排序已更新" });
    } catch (error) {
      console.error("Error updating recipe categories order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/recipe-categories/init", async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      const existingCategories = await storage.getRecipeCategories();
      const existingCategoryNames = new Set(existingCategories.map(c => c.name));
      
      const uniqueCategories = [...new Set(recipes.map(r => r.category))];
      let addedCount = 0;
      
      for (let i = 0; i < uniqueCategories.length; i++) {
        const categoryName = uniqueCategories[i];
        if (!existingCategoryNames.has(categoryName)) {
          await storage.createRecipeCategory({ name: categoryName, sortOrder: i });
          addedCount++;
        }
      }
      
      res.json({ message: `已初始化 ${addedCount} 個配方分類`, added: addedCount });
    } catch (error) {
      console.error("Error initializing recipe categories:", error);
      res.status(500).json({ message: "初始化分類失敗" });
    }
  });

  // Product Categories routes
  app.get("/api/product-categories", async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get product categories error:', error);
      res.status(500).json({ message: "獲取商品分類失敗" });
    }
  });

  app.post("/api/product-categories", async (req, res) => {
    try {
      const { insertProductCategorySchema } = await import("@shared/schema");
      const categoryData = insertProductCategorySchema.parse(req.body);
      const category = await storage.createProductCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create product category error:', error);
      res.status(400).json({ message: "新增商品分類失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/product-categories/:id", async (req, res) => {
    try {
      const { insertProductCategorySchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const categoryData = insertProductCategorySchema.partial().parse(req.body);
      
      // 如果修改了分類名稱，需要同步更新所有商品
      if (categoryData.name) {
        const oldCategory = await storage.getProductCategoryById(id);
        if (oldCategory && oldCategory.name !== categoryData.name) {
          await storage.updateProductsCategory(oldCategory.name, categoryData.name);
        }
      }
      
      const category = await storage.updateProductCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error('Update product category error:', error);
      res.status(400).json({ message: "更新商品分類失敗" });
    }
  });

  app.delete("/api/product-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProductCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete product category error:', error);
      res.status(500).json({ message: "刪除商品分類失敗" });
    }
  });

  app.post("/api/product-categories/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.reorderProductCategories(orderUpdates);
      res.json({ message: "商品分類排序已更新" });
    } catch (error) {
      console.error("Error updating product categories order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/product-categories/init", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const existingCategories = await storage.getProductCategories();
      const existingCategoryNames = new Set(existingCategories.map(c => c.name));
      
      const uniqueCategories = [...new Set(products.map(p => p.category))];
      let addedCount = 0;
      
      for (let i = 0; i < uniqueCategories.length; i++) {
        const categoryName = uniqueCategories[i];
        if (!existingCategoryNames.has(categoryName)) {
          await storage.createProductCategory({ name: categoryName, sortOrder: i });
          addedCount++;
        }
      }
      
      res.json({ message: `已初始化 ${addedCount} 個商品分類`, added: addedCount });
    } catch (error) {
      console.error("Error initializing product categories:", error);
      res.status(500).json({ message: "初始化分類失敗" });
    }
  });

  // Custom Product Categories routes
  app.get("/api/custom-product-categories", async (req, res) => {
    try {
      const categories = await storage.getCustomProductCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get custom product categories error:', error);
      res.status(500).json({ message: "獲取客製商品分類失敗" });
    }
  });

  app.post("/api/custom-product-categories", async (req, res) => {
    try {
      const { insertCustomProductCategorySchema } = await import("@shared/schema");
      const categoryData = insertCustomProductCategorySchema.parse(req.body);
      const category = await storage.createCustomProductCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create custom product category error:', error);
      res.status(400).json({ message: "新增客製商品分類失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/custom-product-categories/:id", async (req, res) => {
    try {
      const { insertCustomProductCategorySchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const categoryData = insertCustomProductCategorySchema.partial().parse(req.body);
      
      // 如果修改了分類名稱，需要同步更新所有客製商品
      if (categoryData.name) {
        const oldCategory = await storage.getCustomProductCategoryById(id);
        if (oldCategory && oldCategory.name !== categoryData.name) {
          await storage.updateCustomProductsCategory(oldCategory.name, categoryData.name);
        }
      }
      
      const category = await storage.updateCustomProductCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error('Update custom product category error:', error);
      res.status(400).json({ message: "更新客製商品分類失敗" });
    }
  });

  app.delete("/api/custom-product-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomProductCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete custom product category error:', error);
      res.status(500).json({ message: "刪除客製商品分類失敗" });
    }
  });

  app.post("/api/custom-product-categories/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.reorderCustomProductCategories(orderUpdates);
      res.json({ message: "客製商品分類排序已更新" });
    } catch (error) {
      console.error("Error updating custom product categories order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/custom-product-categories/init", async (req, res) => {
    try {
      const customProducts = await storage.getCustomProducts();
      const existingCategories = await storage.getCustomProductCategories();
      const existingCategoryNames = new Set(existingCategories.map(c => c.name));
      
      const uniqueCategories = [...new Set(customProducts.map(p => p.category))];
      let addedCount = 0;
      
      for (let i = 0; i < uniqueCategories.length; i++) {
        const categoryName = uniqueCategories[i];
        if (!existingCategoryNames.has(categoryName)) {
          await storage.createCustomProductCategory({ name: categoryName, sortOrder: i });
          addedCount++;
        }
      }
      
      res.json({ message: `已初始化 ${addedCount} 個客製商品分類`, added: addedCount });
    } catch (error) {
      console.error("Error initializing custom product categories:", error);
      res.status(500).json({ message: "初始化分類失敗" });
    }
  });

  // Packaging Categories routes
  app.get("/api/packaging-categories", async (req, res) => {
    try {
      const categories = await storage.getPackagingCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get packaging categories error:', error);
      res.status(500).json({ message: "獲取包裝分類失敗" });
    }
  });

  app.post("/api/packaging-categories", async (req, res) => {
    try {
      const { insertPackagingCategorySchema } = await import("@shared/schema");
      const categoryData = insertPackagingCategorySchema.parse(req.body);
      const category = await storage.createPackagingCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create packaging category error:', error);
      res.status(400).json({ message: "新增包裝分類失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/packaging-categories/:id", async (req, res) => {
    try {
      const { insertPackagingCategorySchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const categoryData = insertPackagingCategorySchema.partial().parse(req.body);
      
      // 如果修改了分類名稱，需要同步更新所有包裝材料的type欄位
      if (categoryData.name) {
        const oldCategory = await storage.getPackagingCategoryById(id);
        if (oldCategory && oldCategory.name !== categoryData.name) {
          await storage.updatePackagingType(oldCategory.name, categoryData.name);
        }
      }
      
      const category = await storage.updatePackagingCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error('Update packaging category error:', error);
      res.status(400).json({ message: "更新包裝分類失敗" });
    }
  });

  app.delete("/api/packaging-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePackagingCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete packaging category error:', error);
      res.status(500).json({ message: "刪除包裝分類失敗" });
    }
  });

  app.post("/api/packaging-categories/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.updatePackagingCategoriesOrder(orderUpdates);
      res.json({ message: "包裝分類排序已更新" });
    } catch (error) {
      console.error("Error updating packaging categories order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  // Packaging routes
  app.get("/api/packaging", async (req, res) => {
    try {
      const { search, type } = req.query;
      const packaging = await storage.getPackaging(
        search as string,
        type as string
      );
      res.json(packaging);
    } catch (error) {
      res.status(500).json({ message: "獲取包裝材料資料失敗" });
    }
  });

  app.post("/api/packaging", async (req, res) => {
    try {
      const packagingData = insertPackagingSchema.parse(req.body);
      const packaging = await storage.createPackaging(packagingData);
      res.status(201).json(packaging);
    } catch (error) {
      res.status(400).json({ message: "新增包裝材料失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/packaging/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const packagingData = insertPackagingSchema.partial().parse(req.body);
      const packaging = await storage.updatePackaging(id, packagingData);
      res.json(packaging);
    } catch (error) {
      res.status(400).json({ message: "更新包裝材料失敗，請檢查輸入資料" });
    }
  });

  app.delete("/api/packaging/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePackaging(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "刪除包裝材料失敗" });
    }
  });

  // Packaging import/export
  app.post("/api/packaging/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;
      let updatedCount = 0;

      for (const row of data as any[]) {
        if (!row["包裝名稱"] || !row["類型"] || !row["單位成本"]) continue;

        const packagingData = {
          name: row["包裝名稱"],
          type: row["類型"],
          unitCost: row["單位成本"].toString(),
          notes: row["備註"] || "",
        };

        try {
          const existingPackaging = await storage.getPackaging(packagingData.name);
          const existing = existingPackaging.find(p => p.name === packagingData.name);

          if (existing) {
            await storage.updatePackaging(existing.id, packagingData);
            updatedCount++;
          } else {
            await storage.createPackaging(packagingData);
            importedCount++;
          }
        } catch (error) {
          console.error("Import packaging error:", error);
        }
      }

      res.json({ 
        message: `匯入完成：新增 ${importedCount} 項，更新 ${updatedCount} 項包裝材料`,
        imported: importedCount,
        updated: updatedCount
      });
    } catch (error) {
      res.status(500).json({ message: "匯入失敗，請檢查檔案格式" });
    }
  });

  app.get("/api/packaging/export", async (req, res) => {
    try {
      const packaging = await storage.getPackaging();
      const data = packaging.map(item => ({
        "包裝名稱": item.name,
        "類型": item.type,
        "單位成本": parseFloat(item.unitCost),
        "備註": item.notes || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "包裝材料清單");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      const filename = `packaging-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "匯出失敗" });
    }
  });

  // Products routes
  // Export route must come before :id route to avoid route conflicts
  app.get("/api/products/export", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const data = products.map(product => {
        // 格式化配方清單為「配方名稱1:數量,配方名稱2:數量,…」
        const recipesText = product.recipes
          .filter(recipe => parseFloat(recipe.quantity) > 0)
          .map(recipe => `${recipe.recipe.name}:${recipe.quantity}`)
          .join(',');

        // 格式化包裝清單為「包裝名稱1:數量,包裝名稱2:數量,…」
        const packagingText = product.packaging
          .filter(pack => parseFloat(pack.quantity.toString()) > 0)
          .map(pack => `${pack.packaging.name}:${pack.quantity}`)
          .join(',');

        return {
          "商品名稱": product.name,
          "分類": product.category,
          "售價": product.sellingPrice,
          "管理費(%)": product.managementFeePercentage,
          "配方清單": recipesText,
          "包裝清單": packagingText,
          "商品描述": product.description || "",
          "原成本": product.totalCost || 0,
          "管理費": product.managementFee || 0,
          "攤提後成本": product.adjustedCost || 0,
          "利潤": product.profit || 0,
          "利潤率(%)": product.profitMargin || 0,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "商品清單");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      const filename = `products-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Products export error:", error);
      res.status(500).json({ message: "匯出失敗" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const { search, category } = req.query;
      const products = await storage.getProducts(
        search as string,
        category as string
      );
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "獲取商品資料失敗" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { recipes = [], packaging = [], ...productData } = req.body;
      
      // Validate product data
      const product = insertProductSchema.parse(productData);
      
      // Transform and validate recipes
      const parsedRecipes = recipes
        .filter((r: any) => r.recipeId && parseFloat(r.quantity) > 0)
        .map((r: any) => ({
          recipeId: parseInt(r.recipeId),
          quantity: r.quantity.toString(),
          unit: r.unit || "portions",
        }));
      
      // Transform and validate packaging
      const parsedPackaging = packaging
        .filter((p: any) => p.packagingId && parseFloat(p.quantity) > 0)
        .map((p: any) => ({
          packagingId: parseInt(p.packagingId),
          quantity: parseFloat(p.quantity),
        }));
      
      const created = await storage.createProduct(product, parsedRecipes, parsedPackaging);
      res.status(201).json(created);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({ message: "新增商品失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { recipes, packaging, ...productData } = req.body;
      const product = insertProductSchema.partial().parse(productData);
      
      // Transform and validate recipes if provided
      const parsedRecipes = recipes ? recipes
        .filter((r: any) => r.recipeId && parseFloat(r.quantity) > 0)
        .map((r: any) => ({
          recipeId: parseInt(r.recipeId),
          quantity: r.quantity.toString(),
          unit: r.unit || "portions",
        })) : undefined;
      
      // Transform and validate packaging if provided
      const parsedPackaging = packaging ? packaging
        .filter((p: any) => p.packagingId && parseFloat(p.quantity) > 0)
        .map((p: any) => ({
          packagingId: parseInt(p.packagingId),
          quantity: parseFloat(p.quantity),
        })) : undefined;
      
      const updated = await storage.updateProduct(id, product, parsedRecipes, parsedPackaging);
      res.json(updated);
    } catch (error) {
      console.error("Product update error:", error);
      res.status(400).json({ message: "更新商品失敗，請檢查輸入資料" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "刪除商品失敗" });
    }
  });

  // Products import/export
  app.post("/api/products/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // 取得所有配方和包裝資料來進行名稱匹配
      const recipes = await storage.getRecipes();
      const packaging = await storage.getPackaging();

      let importedCount = 0;
      let updatedCount = 0;

      for (const row of data as any[]) {
        if (!row["商品名稱"] || !row["分類"] || !row["售價"]) continue;

        const productData = {
          name: row["商品名稱"],
          category: row["分類"],
          sellingPrice: row["售價"].toString(),
          managementFeePercentage: row["管理費(%)"] ? row["管理費(%)"].toString() : "3.00",
          description: row["商品描述"] || row["備註"] || "",
        };

        // 解析配方清單
        const productRecipes = [];
        const recipesText = row["配方清單"] || "";
        if (recipesText) {
          const recipePairs = recipesText.split(',').map((pair: string) => pair.trim());
          for (const pair of recipePairs) {
            const [recipeName, quantity] = pair.split(':').map((s: string) => s.trim());
            if (recipeName && quantity && parseFloat(quantity) > 0) {
              const recipe = recipes.find((r: any) => r.name === recipeName);
              if (recipe) {
                productRecipes.push({
                  recipeId: recipe.id,
                  quantity: quantity,
                  productId: 0, // 將在創建產品後設置
                  unit: "portions",
                });
              }
            }
          }
        }

        // 解析包裝清單
        const productPackaging = [];
        const packagingText = row["包裝清單"] || "";
        if (packagingText) {
          const packagingPairs = packagingText.split(',').map((pair: string) => pair.trim());
          for (const pair of packagingPairs) {
            const [packagingName, quantity] = pair.split(':').map((s: string) => s.trim());
            if (packagingName && quantity && parseFloat(quantity) > 0) {
              const pack = packaging.find((p: any) => p.name === packagingName);
              if (pack) {
                productPackaging.push({
                  packagingId: pack.id,
                  quantity: parseFloat(quantity),
                });
              }
            }
          }
        }

        try {
          const existingProducts = await storage.getProducts(productData.name);
          const existing = existingProducts.find(p => p.name === productData.name);

          if (existing) {
            await storage.updateProduct(existing.id, productData, productRecipes, productPackaging);
            updatedCount++;
          } else {
            await storage.createProduct(productData, productRecipes, productPackaging);
            importedCount++;
          }
        } catch (error) {
          console.error("Import product error:", error);
        }
      }

      res.json({ 
        message: `匯入完成：新增 ${importedCount} 項，更新 ${updatedCount} 項商品`,
        imported: importedCount,
        updated: updatedCount
      });
    } catch (error) {
      console.error("Products import error:", error);
      res.status(500).json({ message: "匯入失敗，請檢查檔案格式" });
    }
  });

  // Nutrition routes
  app.get("/api/nutrition", async (req, res) => {
    try {
      const { search, category } = req.query;
      const nutrition = await storage.getNutritionFacts(
        search as string,
        category as string
      );
      res.json(nutrition);
    } catch (error) {
      res.status(500).json({ message: "獲取營養成分資料失敗" });
    }
  });

  app.post("/api/nutrition", async (req, res) => {
    try {
      const nutritionData = insertNutritionFactsSchema.parse(req.body);
      const nutrition = await storage.createNutritionFacts(nutritionData);
      res.status(201).json(nutrition);
    } catch (error) {
      res.status(400).json({ message: "新增營養成分失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/nutrition/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const nutritionData = insertNutritionFactsSchema.partial().parse(req.body);
      const nutrition = await storage.updateNutritionFacts(id, nutritionData);
      res.json(nutrition);
    } catch (error) {
      res.status(400).json({ message: "更新營養成分失敗，請檢查輸入資料" });
    }
  });

  app.delete("/api/nutrition/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNutritionFacts(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "刪除營養成分失敗" });
    }
  });

  // Nutrition import/export
  app.post("/api/nutrition/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // 取得所有原料來進行名稱匹配
      const materials = await storage.getMaterials();

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const row of data as any[]) {
        const itemName = row["品項名稱"];
        if (!itemName) {
          skippedCount++;
          continue;
        }

        // 根據原料名稱找到對應的原料
        const material = materials.find(m => m.name === itemName || m.name.includes(itemName) || itemName.includes(m.name));
        
        if (!material) {
          console.log(`找不到對應原料: ${itemName}`);
          skippedCount++;
          continue;
        }

        // 解析營養成分數據，處理空值和字符串
        const parseNutritionValue = (value: any): number => {
          if (value === "" || value === null || value === undefined) return 0;
          const parsed = parseFloat(value.toString().trim());
          return isNaN(parsed) ? 0 : parsed;
        };

        const nutritionData = {
          materialId: material.id,
          calories: String(parseNutritionValue(row[" 修正熱量(kcal) "] || row["修正熱量(kcal)"] || row["熱量"])),
          protein: String(parseNutritionValue(row[" 粗蛋白(g) "] || row["粗蛋白(g)"] || row["蛋白質"])),
          fat: String(parseNutritionValue(row[" 粗脂肪(g) "] || row["粗脂肪(g)"] || row["脂肪"])),
          saturatedFat: String(parseNutritionValue(row[" 飽和脂肪(g) "] || row["飽和脂肪(g)"] || row["飽和脂肪"])),
          transFat: String(0), // 檔案中沒有反式脂肪數據，設為0
          carbohydrates: String(parseNutritionValue(row[" 總碳水化合物(g) "] || row["總碳水化合物(g)"] || row["碳水化合物"])),
          sugar: String(parseNutritionValue(row[" 糖質總量(g) "] || row["糖質總量(g)"] || row["糖"])),
          sodium: String(parseNutritionValue(row[" 鈉(mg) "] || row["鈉(mg)"] || row["鈉"])),
        };

        try {
          // 檢查是否已存在該原料的營養成分
          const existingNutrition = await storage.getNutritionFactsForMaterial(material.id);

          if (existingNutrition) {
            await storage.updateNutritionFacts(existingNutrition.id, nutritionData);
            updatedCount++;
          } else {
            await storage.createNutritionFacts(nutritionData);
            importedCount++;
          }
        } catch (error) {
          console.error(`Import nutrition error for ${itemName}:`, error);
          skippedCount++;
        }
      }

      res.json({ 
        message: `匯入完成：新增 ${importedCount} 項，更新 ${updatedCount} 項，跳過 ${skippedCount} 項營養成分`,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount
      });
    } catch (error) {
      console.error("Nutrition import error:", error);
      res.status(500).json({ message: "匯入失敗，請檢查檔案格式" });
    }
  });

  // Nutrition facts export
  app.get("/api/nutrition-facts/export", async (req, res) => {
    try {
      // 取得所有原料
      const allMaterials = await storage.getMaterials();
      
      // 取得已有營養資料的原料
      const nutritionFacts = await storage.getNutritionFacts();
      const nutritionMap = new Map();
      nutritionFacts.forEach(nf => {
        if (nf && nf.materialId) {
          nutritionMap.set(nf.materialId, nf);
        }
      });
      
      // 組合所有原料，缺少營養資料的補0
      const data = allMaterials.map(material => {
        const nutrition = nutritionMap.get(material.id);
        return {
          "原料名稱": material.name,
          "類別": material.category,
          "熱量(kcal/100g)": nutrition?.calories || "0",
          "蛋白質(g/100g)": nutrition?.protein || "0",
          "脂肪(g/100g)": nutrition?.fat || "0",
          "飽和脂肪(g/100g)": nutrition?.saturatedFat || "0",
          "反式脂肪(g/100g)": nutrition?.transFat || "0",
          "碳水化合物(g/100g)": nutrition?.carbohydrates || "0",
          "糖(g/100g)": nutrition?.sugar || "0",
          "鈉(mg/100g)": nutrition?.sodium || "0"
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "營養成分");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Disposition", "attachment; filename=nutrition-facts.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Nutrition facts export error:", error);
      res.status(500).json({ message: "匯出營養成分失敗" });
    }
  });

  // Recipe nutrition routes
  app.get("/api/nutrition/recipes", async (req, res) => {
    try {
      const recipeNutrition = await storage.getAllRecipeNutrition();
      res.json(recipeNutrition);
    } catch (error) {
      res.status(500).json({ message: "獲取配方營養成分失敗" });
    }
  });

  app.get("/api/nutrition/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const nutrition = await storage.getRecipeNutrition(id);
      if (!nutrition) {
        return res.status(404).json({ message: "配方營養成分不存在" });
      }
      res.json(nutrition);
    } catch (error) {
      res.status(500).json({ message: "獲取配方營養成分失敗" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "獲取統計資料失敗" });
    }
  });

  // 排序API
  app.post("/api/materials/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.updateMaterialsOrder(orderUpdates);
      res.json({ message: "原料排序已更新" });
    } catch (error) {
      console.error("Error updating materials order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/recipes/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.updateRecipesOrder(orderUpdates);
      res.json({ message: "配方排序已更新" });
    } catch (error) {
      console.error("Error updating recipes order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/packaging/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.updatePackagingOrder(orderUpdates);
      res.json({ message: "包裝排序已更新" });
    } catch (error) {
      console.error("Error updating packaging order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  app.post("/api/products/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.updateProductsOrder(orderUpdates);
      res.json({ message: "商品排序已更新" });
    } catch (error) {
      console.error("Error updating products order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  // Custom Products routes
  app.get("/api/custom-products/export", async (req, res) => {
    try {
      const customProducts = await storage.getCustomProducts();
      const data = customProducts.map(customProduct => {
        // 格式化產品清單為「產品名稱1:數量,產品名稱2:數量,…」
        const itemsText = customProduct.items
          .filter(item => parseFloat(item.quantity) > 0)
          .map(item => `${item.product.name}:${item.quantity}`)
          .join(',');

        // 格式化包裝清單為「包裝名稱1:數量,包裝名稱2:數量,…」
        const packagingText = customProduct.packaging
          .filter(pack => parseFloat(pack.quantity.toString()) > 0)
          .map(pack => `${pack.packaging.name}:${pack.quantity}`)
          .join(',');

        return {
          "客製商品名稱": customProduct.name,
          "分類": customProduct.category,
          "售價": customProduct.sellingPrice,
          "管理費(%)": customProduct.managementFeePercentage,
          "產品清單": itemsText,
          "包裝清單": packagingText,
          "商品描述": customProduct.description || "",
          "原成本": customProduct.totalCost || 0,
          "管理費": customProduct.managementFee || 0,
          "攤提後成本": customProduct.adjustedCost || 0,
          "利潤": customProduct.profit || 0,
          "利潤率(%)": customProduct.profitMargin || 0,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "客製商品");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=custom-products-${new Date().toISOString().split('T')[0]}.xlsx`
      );
      res.send(excelBuffer);
    } catch (error) {
      console.error("Custom products export error:", error);
      res.status(500).json({ message: "匯出客製商品失敗" });
    }
  });

  app.get("/api/custom-products", async (req, res) => {
    try {
      const { search, category } = req.query;
      const customProducts = await storage.getCustomProducts(
        search as string,
        category as string
      );
      res.json(customProducts);
    } catch (error) {
      res.status(500).json({ message: "獲取客製商品資料失敗" });
    }
  });

  app.post("/api/custom-products", async (req, res) => {
    try {
      const { items = [], packaging = [], ...customProductData } = req.body;
      
      // Validate custom product data
      const customProduct = insertCustomProductSchema.parse(customProductData);
      
      // Transform and validate items
      const parsedItems = items
        .filter((i: any) => i.productId && parseFloat(i.quantity) > 0)
        .map((i: any) => ({
          productId: parseInt(i.productId),
          quantity: i.quantity.toString(),
        }));
      
      // Transform and validate packaging
      const parsedPackaging = packaging
        .filter((p: any) => p.packagingId && parseFloat(p.quantity) > 0)
        .map((p: any) => ({
          packagingId: parseInt(p.packagingId),
          quantity: parseFloat(p.quantity),
        }));
      
      const created = await storage.createCustomProduct(customProduct, parsedItems, parsedPackaging);
      res.status(201).json(created);
    } catch (error) {
      console.error("Custom product creation error:", error);
      res.status(400).json({ message: "新增客製商品失敗，請檢查輸入資料" });
    }
  });

  app.put("/api/custom-products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { items, packaging, ...customProductData } = req.body;
      const customProduct = insertCustomProductSchema.partial().parse(customProductData);
      
      // Transform and validate items if provided
      const parsedItems = items ? items
        .filter((i: any) => i.productId && parseFloat(i.quantity) > 0)
        .map((i: any) => ({
          productId: parseInt(i.productId),
          quantity: i.quantity.toString(),
        })) : undefined;
      
      // Transform and validate packaging if provided
      const parsedPackaging = packaging ? packaging
        .filter((p: any) => p.packagingId && parseFloat(p.quantity) > 0)
        .map((p: any) => ({
          packagingId: parseInt(p.packagingId),
          quantity: parseFloat(p.quantity),
        })) : undefined;
      
      const updated = await storage.updateCustomProduct(id, customProduct, parsedItems, parsedPackaging);
      res.json(updated);
    } catch (error) {
      console.error("Custom product update error:", error);
      res.status(400).json({ message: "更新客製商品失敗，請檢查輸入資料" });
    }
  });

  app.delete("/api/custom-products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomProduct(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "刪除客製商品失敗" });
    }
  });

  app.post("/api/custom-products/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // 取得所有產品和包裝資料來進行名稱匹配
      const products = await storage.getProducts();
      const packaging = await storage.getPackaging();

      let importedCount = 0;
      let updatedCount = 0;

      for (const row of data as any[]) {
        if (!row["客製商品名稱"] || !row["分類"] || !row["售價"]) continue;

        const customProductData = {
          name: row["客製商品名稱"],
          category: row["分類"],
          sellingPrice: row["售價"].toString(),
          managementFeePercentage: row["管理費(%)"] ? row["管理費(%)"].toString() : "3.00",
          description: row["商品描述"] || row["備註"] || "",
        };

        // 解析產品清單
        const customProductItems = [];
        const itemsText = row["產品清單"] || "";
        if (itemsText) {
          const itemPairs = itemsText.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          for (const pair of itemPairs) {
            const [productName, quantity] = pair.split(':').map((s: string) => s.trim());
            if (productName && quantity) {
              const product = products.find(p => p.name === productName);
              if (product) {
                customProductItems.push({
                  productId: product.id,
                  quantity: parseFloat(quantity).toString(),
                });
              }
            }
          }
        }

        // 解析包裝清單
        const customProductPackaging = [];
        const packagingText = row["包裝清單"] || "";
        if (packagingText) {
          const packPairs = packagingText.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          for (const pair of packPairs) {
            const [packName, quantity] = pair.split(':').map((s: string) => s.trim());
            if (packName && quantity) {
              const pack = packaging.find(p => p.name === packName);
              if (pack) {
                customProductPackaging.push({
                  packagingId: pack.id,
                  quantity: parseInt(quantity),
                });
              }
            }
          }
        }

        // 檢查是否已存在相同名稱的客製商品
        const existingCustomProducts = await storage.getCustomProducts();
        const existingCustomProduct = existingCustomProducts.find(p => p.name === customProductData.name);

        if (existingCustomProduct) {
          // 更新現有客製商品
          await storage.updateCustomProduct(
            existingCustomProduct.id,
            customProductData,
            customProductItems,
            customProductPackaging
          );
          updatedCount++;
        } else {
          // 新增客製商品
          await storage.createCustomProduct(
            customProductData,
            customProductItems,
            customProductPackaging
          );
          importedCount++;
        }
      }

      res.json({
        message: `成功匯入 ${importedCount} 筆客製商品，更新 ${updatedCount} 筆客製商品`,
        imported: importedCount,
        updated: updatedCount,
      });
    } catch (error) {
      console.error("Custom products import error:", error);
      res.status(500).json({ message: "匯入客製商品失敗" });
    }
  });

  app.post("/api/custom-products/reorder", async (req, res) => {
    try {
      const { orderUpdates } = req.body;
      await storage.updateCustomProductsOrder(orderUpdates);
      res.json({ message: "客製商品排序已更新" });
    } catch (error) {
      console.error("Error updating custom products order:", error);
      res.status(500).json({ message: "更新排序失敗" });
    }
  });

  // 備份與還原 API
  app.post("/api/backup/create", async (req, res) => {
    try {
      const backupPath = await createFullBackup();
      res.json({ 
        message: "備份創建成功",
        backupPath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Backup creation failed:", error);
      res.status(500).json({ message: `備份創建失敗: ${error}` });
    }
  });

  app.get("/api/backup/list", async (req, res) => {
    try {
      const backups = await getAvailableBackups();
      res.json(backups);
    } catch (error) {
      console.error("Failed to get backup list:", error);
      res.status(500).json({ message: "獲取備份清單失敗" });
    }
  });

  app.post("/api/backup/restore", upload.single("backupFile"), async (req, res) => {
    try {
      let backupPath: string;
      
      if (req.file) {
        // 從上傳的檔案還原
        const tempPath = `/tmp/restore-${Date.now()}.json`;
        await fs.writeFile(tempPath, req.file.buffer);
        backupPath = tempPath;
      } else if (req.body.backupPath) {
        // 從伺服器備份還原
        backupPath = req.body.backupPath;
      } else {
        return res.status(400).json({ message: "請提供備份檔案或選擇伺服器備份" });
      }

      const result = await restoreFromBackup(backupPath);
      
      // 清理暫存檔案
      if (req.file) {
        try {
          await fs.unlink(backupPath);
        } catch (error) {
          console.error("Failed to clean temp file:", error);
        }
      }

      if (result.success) {
        res.json({
          message: result.message,
          restored: result.restored
        });
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (error) {
      console.error("Restore failed:", error);
      res.status(500).json({ message: `還原失敗: ${error}` });
    }
  });

  app.get("/api/backup/download/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      // 安全檢查：只允許下載backup-開頭的.json檔案
      if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
        return res.status(400).json({ message: "無效的備份檔案名稱" });
      }

      const backupPath = path.join(process.cwd(), 'backups', filename);
      
      // 檢查檔案是否存在
      try {
        await fs.access(backupPath);
      } catch {
        return res.status(404).json({ message: "備份檔案不存在" });
      }

      // 設定下載標頭
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // 發送檔案
      res.sendFile(backupPath);
    } catch (error) {
      console.error("Failed to download backup:", error);
      res.status(500).json({ message: "下載備份檔案失敗" });
    }
  });

  app.delete("/api/backup/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      // 安全檢查：只允許刪除backup-開頭的.json檔案
      if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
        return res.status(400).json({ message: "無效的備份檔案名稱" });
      }

      const backupPath = path.join(process.cwd(), 'backups', filename);
      await fs.unlink(backupPath);
      
      res.json({ message: "備份檔案已刪除" });
    } catch (error) {
      console.error("Failed to delete backup:", error);
      res.status(500).json({ message: "刪除備份檔案失敗" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "帳號和密碼為必填項目" });
      }

      // 檢查用戶名和密碼（使用資料庫驗證）
      if (username === ADMIN_USERNAME) {
        const userSettings = await storage.getUserSettings(ADMIN_USERNAME);
        if (userSettings && await bcrypt.compare(password, userSettings.passwordHash)) {
          (req.session as any).authenticated = true;
            
            // 檢查是否為今日首次登入，如果是則觸發自動備份
            const { isFirstLoginToday, createFullBackup, cleanOldBackups } = await import("./backup");
            if (await isFirstLoginToday()) {
              // 異步執行備份，不阻塞登入回應
              setImmediate(async () => {
                try {
                  await createFullBackup();
                  await cleanOldBackups();
                } catch (error) {
                  console.error("Auto backup failed:", error);
                }
              });
            }
            
          res.json({ authenticated: true, username: ADMIN_USERNAME });
        } else {
          res.status(401).json({ message: "帳號或密碼錯誤" });
        }
      } else {
        res.status(401).json({ message: "帳號或密碼錯誤" });
      }
    } catch (error) {
      res.status(500).json({ message: "登入失敗" });
    }
  });

  app.get("/api/auth/check", (req, res) => {
    res.json({ 
      authenticated: !!(req.session as any)?.authenticated,
      username: (req.session as any)?.authenticated ? "admin" : null 
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "登出失敗" });
      }
      res.json({ message: "已成功登出" });
    });
  });

  app.put("/api/auth/change-password", async (req, res) => {
    try {
      if (!(req.session as any)?.authenticated) {
        return res.status(401).json({ message: "請先登入" });
      }

      const { currentPassword: inputCurrentPassword, newPassword } = req.body;
      
      if (!inputCurrentPassword || !newPassword) {
        return res.status(400).json({ message: "請提供當前密碼和新密碼" });
      }

      // 驗證當前密碼（使用資料庫驗證）
      const userSettings = await storage.getUserSettings(ADMIN_USERNAME);
      if (!userSettings || !await bcrypt.compare(inputCurrentPassword, userSettings.passwordHash)) {
        return res.status(400).json({ message: "當前密碼錯誤" });
      }

      // 更新密碼並即時儲存到資料庫
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updatePassword(ADMIN_USERNAME, newPasswordHash);
      
      console.log(`Password updated for user: ${ADMIN_USERNAME}`);
      
      res.json({ message: "密碼修改成功" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "密碼修改失敗" });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      if (!(req.session as any)?.authenticated) {
        return res.status(401).json({ message: "請先登入" });
      }
      
      // 即時從資料庫載入最新設定
      const userSettings = await storage.getUserSettings(ADMIN_USERNAME);
      if (userSettings) {
        res.json({
          profitMargin: {
            lowThreshold: parseFloat(userSettings.profitMarginLow),
            highThreshold: parseFloat(userSettings.profitMarginHigh)
          }
        });
      } else {
        res.json({
          profitMargin: DEFAULT_SETTINGS.profitMargin
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      res.status(500).json({ message: "載入設定失敗" });
    }
  });

  app.put("/api/settings/profit-margin", async (req, res) => {
    try {
      if (!(req.session as any)?.authenticated) {
        return res.status(401).json({ message: "請先登入" });
      }

      const { lowThreshold, highThreshold } = req.body;
      
      if (lowThreshold >= highThreshold) {
        return res.status(400).json({ message: "低門檻值必須小於高門檻值" });
      }

      // 即時更新利潤率設定到資料庫
      await storage.updateProfitMargins(ADMIN_USERNAME, lowThreshold, highThreshold);
      
      // 更新快取
      appSettings.profitMargin = { lowThreshold, highThreshold };
      
      res.json({ 
        profitMargin: appSettings.profitMargin,
        message: "利潤率設定已保存"
      });
    } catch (error) {
      res.status(500).json({ message: "保存設定失敗" });
    }
  });

  // Backup routes (舊版本，用於相容性)
  app.get("/api/backup", async (req, res) => {
    try {
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
        description: "手動備份",
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

      const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/json");
      res.json(backupData);
    } catch (error) {
      console.error("Backup error:", error);
      res.status(500).json({ message: "備份失敗" });
    }
  });

  app.post("/api/restore", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇備份檔案" });
      }

      const backupContent = req.file.buffer.toString('utf-8');
      const backupData = JSON.parse(backupContent);

      // 支持新舊兩種備份格式
      // 新格式: backupData.data.materials
      // 舊格式: backupData.materials
      const isNewFormat = backupData.data !== undefined;
      
      if (!isNewFormat && !backupData.materials && !backupData.recipes && !backupData.products && !backupData.packaging && !backupData.nutrition) {
        return res.status(400).json({ message: "備份檔案格式錯誤" });
      }
      
      if (isNewFormat && !backupData.data) {
        return res.status(400).json({ message: "備份檔案格式錯誤" });
      }

      // 提取資料（支持新舊格式）
      const data = isNewFormat ? backupData.data : backupData;
      const materials = data.materials || [];
      const packaging = data.packaging || [];
      const recipes = data.recipes || [];
      const products = data.products || [];
      const customProducts = data.customProducts || [];
      const nutritionFacts = data.nutrition || data.nutritionFacts || [];
      
      let restoredCount = 0;

      // Restore materials first (as they are referenced by recipes)
      if (materials && Array.isArray(materials)) {
        for (const material of materials) {
          try {
            const { id, createdAt, updatedAt, ...materialData } = material;
            
            // Check if material exists by name
            const existingMaterials = await storage.getMaterials(materialData.name);
            const existing = existingMaterials.find(m => m.name === materialData.name);

            if (existing) {
              await storage.updateMaterial(existing.id, materialData);
            } else {
              await storage.createMaterial(materialData);
            }
            restoredCount++;
          } catch (error) {
            console.error("Restore material error:", error);
          }
        }
      }

      // Restore packaging
      if (packaging && Array.isArray(packaging)) {
        for (const pack of packaging) {
          try {
            const { id, createdAt, updatedAt, ...packagingData } = pack;
            
            const existingPackaging = await storage.getPackaging(packagingData.name);
            const existing = existingPackaging.find(p => p.name === packagingData.name);

            if (existing) {
              await storage.updatePackaging(existing.id, packagingData);
            } else {
              await storage.createPackaging(packagingData);
            }
            restoredCount++;
          } catch (error) {
            console.error("Restore packaging error:", error);
          }
        }
      }

      // Restore recipes (after materials)
      if (recipes && Array.isArray(recipes)) {
        for (const recipe of recipes) {
          try {
            const { id, createdAt, updatedAt, ingredients, totalCost, costPerPortion, costPerGram, ...recipeData } = recipe;
            
            // Prepare ingredients data
            const ingredientsData = ingredients ? ingredients.map((ing: any) => ({
              materialId: ing.materialId,
              quantity: ing.quantity.toString()
            })) : [];

            const existingRecipes = await storage.getRecipes(recipeData.name);
            const existing = existingRecipes.find(r => r.name === recipeData.name);

            if (existing) {
              await storage.updateRecipe(existing.id, recipeData, ingredientsData);
            } else {
              await storage.createRecipe(recipeData, ingredientsData);
            }
            restoredCount++;
          } catch (error) {
            console.error("Restore recipe error:", error);
          }
        }
      }

      // Restore nutrition facts
      if (nutritionFacts && Array.isArray(nutritionFacts)) {
        for (const nutrition of nutritionFacts) {
          try {
            const { id, createdAt, updatedAt, ...nutritionData } = nutrition;
            
            // Skip if materialId is null or undefined
            if (!nutritionData.materialId) {
              console.log("Skipping nutrition data with null materialId");
              continue;
            }
            
            const existing = await storage.getNutritionFactsForMaterial(nutritionData.materialId);

            if (existing) {
              await storage.updateNutritionFacts(existing.id, nutritionData);
            } else {
              await storage.createNutritionFacts(nutritionData);
            }
            restoredCount++;
          } catch (error) {
            console.error("Restore nutrition error:", error);
          }
        }
      }

      // Restore products (after recipes and packaging)
      if (products && Array.isArray(products)) {
        for (const product of products) {
          try {
            const { 
              id, 
              createdAt, 
              updatedAt, 
              recipes: productRecipes, 
              packaging: productPackaging,
              totalCost,
              profit,
              profitMargin,
              ...productData 
            } = product;
            
            // Prepare recipes and packaging data
            const recipesData = productRecipes ? productRecipes.map((pr: any) => ({
              recipeId: pr.recipeId,
              quantity: pr.quantity.toString(),
              unit: pr.unit || "portions"
            })) : [];

            const packagingData = productPackaging ? productPackaging.map((pp: any) => ({
              packagingId: pp.packagingId,
              quantity: parseFloat(pp.quantity)
            })) : [];

            const existingProducts = await storage.getProducts(productData.name);
            const existing = existingProducts.find(p => p.name === productData.name);

            if (existing) {
              await storage.updateProduct(existing.id, productData, recipesData, packagingData);
            } else {
              await storage.createProduct(productData, recipesData, packagingData);
            }
            restoredCount++;
          } catch (error) {
            console.error("Restore product error:", error);
          }
        }
      }

      // Restore custom products (last, as they reference products)
      if (customProducts && Array.isArray(customProducts)) {
        for (const customProduct of customProducts) {
          try {
            const { 
              id, 
              createdAt, 
              updatedAt, 
              items: customProductItems,
              totalCost,
              profit,
              profitMargin,
              ...customProductData 
            } = customProduct;
            
            // Prepare items data (products in custom product)
            const itemsData = customProductItems ? customProductItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity.toString()
            })) : [];

            const existingCustomProducts = await storage.getCustomProducts(customProductData.name);
            const existing = existingCustomProducts.find(cp => cp.name === customProductData.name);

            if (existing) {
              await storage.updateCustomProduct(existing.id, customProductData, itemsData, []);
            } else {
              await storage.createCustomProduct(customProductData, itemsData, []);
            }
            restoredCount++;
          } catch (error) {
            console.error("Restore custom product error:", error);
          }
        }
      }

      res.json({ 
        message: `還原完成：成功還原 ${restoredCount} 項資料`,
        restored: restoredCount
      });
    } catch (error) {
      console.error("Restore error:", error);
      res.status(500).json({ message: "還原失敗，請檢查備份檔案格式" });
    }
  });

  // Taiwan Nutrition Database routes
  app.get("/api/taiwan-nutrition", async (req, res) => {
    try {
      const { search, category } = req.query;
      const data = await storage.getTaiwanNutritionDatabase(search as string, category as string);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "獲取台灣營養資料庫失敗" });
    }
  });

  app.post("/api/taiwan-nutrition/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "請選擇要匯入的檔案" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const nutritionData = data.map((row: any) => ({
        foodCode: row["食品代碼"] || row["代碼"] || null,
        foodName: row["食品名稱"] || row["名稱"] || "",
        category: row["分類"] || row["類別"] || null,
        calories: row["熱量"] ? row["熱量"].toString() : null,
        protein: row["蛋白質"] ? row["蛋白質"].toString() : null,
        fat: row["脂肪"] ? row["脂肪"].toString() : null,
        saturatedFat: row["飽和脂肪"] ? row["飽和脂肪"].toString() : null,
        transFat: row["反式脂肪"] ? row["反式脂肪"].toString() : null,
        carbohydrates: row["碳水化合物"] ? row["碳水化合物"].toString() : null,
        sugar: row["糖"] ? row["糖"].toString() : null,
        sodium: row["鈉"] ? row["鈉"].toString() : null,
        fiber: row["膳食纖維"] ? row["膳食纖維"].toString() : null,
        calcium: row["鈣"] ? row["鈣"].toString() : null,
        iron: row["鐵"] ? row["鐵"].toString() : null,
        vitaminA: row["維生素A"] ? row["維生素A"].toString() : null,
        vitaminC: row["維生素C"] ? row["維生素C"].toString() : null,
        sourceNote: row["資料來源"] || row["備註"] || null,
      }));

      const result = await storage.importTaiwanNutritionDatabase(nutritionData);
      res.json({
        message: `匯入完成：新增 ${result.imported} 項，更新 ${result.updated} 項台灣營養資料`,
        imported: result.imported,
        updated: result.updated
      });
    } catch (error) {
      console.error("Taiwan nutrition import error:", error);
      res.status(500).json({ message: "匯入台灣營養資料庫失敗" });
    }
  });

  // Material Nutrition Mapping routes
  app.get("/api/material-nutrition-mapping", async (req, res) => {
    try {
      const { materialId } = req.query;
      const mappings = await storage.getMaterialNutritionMappings(
        materialId ? parseInt(materialId as string) : undefined
      );
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ message: "獲取原料營養對應失敗" });
    }
  });

  app.post("/api/material-nutrition-mapping", async (req, res) => {
    try {
      const data = insertMaterialNutritionMappingSchema.parse(req.body);
      const created = await storage.createMaterialNutritionMapping(data);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ message: "建立原料營養對應失敗" });
    }
  });

  app.delete("/api/material-nutrition-mapping/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaterialNutritionMapping(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "刪除原料營養對應失敗" });
    }
  });

  // Nutrition Label Templates routes
  app.get("/api/nutrition-label-templates", async (req, res) => {
    try {
      const templates = await storage.getNutritionLabelTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "獲取營養標示模板失敗" });
    }
  });

  app.post("/api/nutrition-label-templates", async (req, res) => {
    try {
      const data = insertNutritionLabelTemplateSchema.parse(req.body);
      const created = await storage.createNutritionLabelTemplate(data);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ message: "建立營養標示模板失敗" });
    }
  });

  // Nutrition Labels routes
  app.get("/api/nutrition-labels", async (req, res) => {
    try {
      const { search } = req.query;
      const labels = await storage.getNutritionLabels(search as string);
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "獲取營養標示失敗" });
    }
  });

  app.post("/api/nutrition-labels", async (req, res) => {
    try {
      console.log("Creating nutrition label with data:", JSON.stringify(req.body, null, 2));
      
      // 確保servingSize是字串格式
      if (req.body.servingSize && typeof req.body.servingSize === 'number') {
        req.body.servingSize = req.body.servingSize.toString();
      }

      // 如果沒有calculatedNutrition，自動計算
      if (!req.body.calculatedNutrition && req.body.recipeIds && req.body.recipeIds.length > 0) {
        console.log("Auto-calculating nutrition for recipes:", req.body.recipeIds);
        
        const servingSize = parseFloat(req.body.servingSize) || 100;
        const servingsPerPackage = parseInt(req.body.servingsPerPackage) || 1;
        
        try {
          const calculatedNutrition = await storage.calculateRecipesNutrition(
            req.body.recipeIds.map((id: string) => parseInt(id)),
            servingSize,
            servingsPerPackage
          );
          
          req.body.calculatedNutrition = calculatedNutrition;
          console.log("Auto-calculated nutrition:", calculatedNutrition);
        } catch (nutritionError) {
          console.error("Nutrition calculation failed, using defaults:", nutritionError);
          // 計算失敗時使用預設值
        }
      }

      // 如果仍然沒有calculatedNutrition，使用預設值
      if (!req.body.calculatedNutrition) {
        const servingSize = parseFloat(req.body.servingSize) || 100;
        const servingsPerPackage = parseInt(req.body.servingsPerPackage) || 1;
        
        req.body.calculatedNutrition = {
          perServing: {
            calories: 0,
            protein: 0,
            fat: 0,
            saturatedFat: 0,
            transFat: 0,
            carbohydrates: 0,
            sugar: 0,
            sodium: 0
          },
          per100g: {
            calories: 0,
            protein: 0,
            fat: 0,
            saturatedFat: 0,
            transFat: 0,
            carbohydrates: 0,
            sugar: 0,
            sodium: 0
          },
          servingSize: servingSize,
          servingsPerPackage: servingsPerPackage,
          totalWeight: servingSize * servingsPerPackage
        };
        console.log("Using default nutrition values");
      }
      
      const data = insertNutritionLabelSchema.parse(req.body);
      const created = await storage.createNutritionLabel(data);
      res.status(201).json(created);
    } catch (error) {
      console.error("Nutrition label creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: `建立營養標示失敗: ${error.message}` });
      } else {
        res.status(400).json({ message: "建立營養標示失敗" });
      }
    }
  });

  app.put("/api/nutrition-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // 確保servingSize是字串格式
      if (req.body.servingSize && typeof req.body.servingSize === 'number') {
        req.body.servingSize = req.body.servingSize.toString();
      }

      // 如果沒有calculatedNutrition，自動計算
      if (!req.body.calculatedNutrition && req.body.recipeIds && req.body.recipeIds.length > 0) {
        console.log("Auto-calculating nutrition for update:", req.body.recipeIds);
        
        const servingSize = parseFloat(req.body.servingSize) || 100;
        const servingsPerPackage = parseInt(req.body.servingsPerPackage) || 1;
        
        try {
          const calculatedNutrition = await storage.calculateRecipesNutrition(
            req.body.recipeIds.map((id: string) => parseInt(id)),
            servingSize,
            servingsPerPackage
          );
          
          req.body.calculatedNutrition = calculatedNutrition;
        } catch (nutritionError) {
          console.error("Nutrition calculation failed for update:", nutritionError);
        }
      }

      // 如果仍然沒有calculatedNutrition，使用預設值
      if (!req.body.calculatedNutrition) {
        const servingSize = parseFloat(req.body.servingSize) || 100;
        const servingsPerPackage = parseInt(req.body.servingsPerPackage) || 1;
        
        req.body.calculatedNutrition = {
          perServing: {
            calories: 200, protein: 4, fat: 8, saturatedFat: 2, transFat: 0,
            carbohydrates: 30, sugar: 5, sodium: 100
          },
          per100g: {
            calories: 200, protein: 4, fat: 8, saturatedFat: 2, transFat: 0,
            carbohydrates: 30, sugar: 5, sodium: 100
          },
          servingSize: servingSize,
          servingsPerPackage: servingsPerPackage,
          totalWeight: servingSize * servingsPerPackage
        };
      }

      const updated = await storage.updateNutritionLabel(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Nutrition label update error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: `更新營養標示失敗: ${error.message}` });
      } else {
        res.status(400).json({ message: "更新營養標示失敗" });
      }
    }
  });

  app.delete("/api/nutrition-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNutritionLabel(id);
      res.status(204).send();
    } catch (error) {
      console.error("Nutrition label deletion error:", error);
      res.status(500).json({ message: "刪除營養標示失敗" });
    }
  });

  // Nutrition calculation route
  app.post("/api/nutrition-labels/calculate", async (req, res) => {
    try {
      const { recipeIds, servingSize, servingsPerPackage } = req.body;
      
      if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({ message: "請選擇至少一個配方" });
      }
      
      if (!servingSize || servingSize <= 0) {
        return res.status(400).json({ message: "請輸入正確的每份重量" });
      }
      
      if (!servingsPerPackage || servingsPerPackage <= 0) {
        return res.status(400).json({ message: "請輸入正確的包裝份數" });
      }

      const calculatedNutrition = await storage.calculateRecipesNutrition(
        recipeIds.map((id: string) => parseInt(id)),
        parseFloat(servingSize),
        parseInt(servingsPerPackage)
      );

      res.json(calculatedNutrition);
    } catch (error) {
      console.error("Nutrition calculation error:", error);
      res.status(500).json({ message: "營養成分計算失敗" });
    }
  });

  // 營養標示生成端點 (Excel格式)
  app.post("/api/nutrition-labels/:id/generate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { format = 'xlsx' } = req.body;
      
      const nutritionLabel = await storage.getNutritionLabel(id);
      if (!nutritionLabel) {
        return res.status(404).json({ message: "營養標示不存在" });
      }

      // 生成Excel格式營養標籤
      if (format !== 'xlsx') {
        return res.status(400).json({ message: "僅支援Excel格式輸出" });
      }

      const excelBuffer = await generateNutritionLabelExcel(nutritionLabel);
      
      const fileName = `${nutritionLabel.name}_營養標示.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Nutrition label generation error:", error);
      res.status(500).json({ message: "營養標示生成失敗" });
    }
  });

  // 營養標示匯出端點
  app.get("/api/nutrition-labels/export", async (req, res) => {
    try {
      const labels = await storage.getNutritionLabels();
      
      const workbook = XLSX.utils.book_new();
      
      // 準備匯出資料
      const exportData = labels.map(label => {
        const nutrition = label.calculatedNutrition;
        return {
          '名稱': label.name,
          '配方數量': label.recipeIds.length,
          '每份重量(g)': label.servingSize,
          '包裝份數': label.servingsPerPackage,
          '總重量(g)': nutrition?.totalWeight || '',
          '每份熱量(kcal)': nutrition?.perServing?.calories ? Math.round(nutrition.perServing.calories) : '',
          '每份蛋白質(g)': nutrition?.perServing?.protein ? Math.round(nutrition.perServing.protein) : '',
          '每份脂肪(g)': nutrition?.perServing?.fat ? Math.round(nutrition.perServing.fat) : '',
          '每份飽和脂肪(g)': nutrition?.perServing?.saturatedFat ? Math.round(nutrition.perServing.saturatedFat) : '',
          '每份反式脂肪(g)': nutrition?.perServing?.transFat ? Math.round(nutrition.perServing.transFat) : '',
          '每份碳水化合物(g)': nutrition?.perServing?.carbohydrates ? Math.round(nutrition.perServing.carbohydrates) : '',
          '每份糖(g)': nutrition?.perServing?.sugar ? Math.round(nutrition.perServing.sugar) : '',
          '每份鈉(mg)': nutrition?.perServing?.sodium ? Math.round(nutrition.perServing.sodium) : '',
          '每100g熱量(kcal)': nutrition?.per100g?.calories ? Math.round(nutrition.per100g.calories) : '',
          '每100g蛋白質(g)': nutrition?.per100g?.protein ? Math.round(nutrition.per100g.protein) : '',
          '每100g脂肪(g)': nutrition?.per100g?.fat ? Math.round(nutrition.per100g.fat) : '',
          '每100g飽和脂肪(g)': nutrition?.per100g?.saturatedFat ? Math.round(nutrition.per100g.saturatedFat) : '',
          '每100g反式脂肪(g)': nutrition?.per100g?.transFat ? Math.round(nutrition.per100g.transFat) : '',
          '每100g碳水化合物(g)': nutrition?.per100g?.carbohydrates ? Math.round(nutrition.per100g.carbohydrates) : '',
          '每100g糖(g)': nutrition?.per100g?.sugar ? Math.round(nutrition.per100g.sugar) : '',
          '每100g鈉(mg)': nutrition?.per100g?.sodium ? Math.round(nutrition.per100g.sodium) : '',
          '建立時間': label.createdAt ? new Date(label.createdAt).toLocaleString('zh-TW') : '',
          '更新時間': label.updatedAt ? new Date(label.updatedAt).toLocaleString('zh-TW') : ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "營養標示");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      
      res.setHeader("Content-Disposition", `attachment; filename=nutrition-labels-${new Date().toISOString().split('T')[0]}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Export nutrition labels error:", error);
      res.status(500).json({ message: "匯出失敗" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
