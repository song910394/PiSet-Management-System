import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 原料表
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  pricePerGram: decimal("price_per_gram", { precision: 10, scale: 4 }).notNull(),
  notes: text("notes"),
  // 新增購入相關欄位（非必填）
  purchaseAmount: decimal("purchase_amount", { precision: 10, scale: 2 }), // 購入金額
  purchaseWeight: decimal("purchase_weight", { precision: 10, scale: 2 }), // 購入重量(g)
  managementFeeRate: decimal("management_fee_rate", { precision: 5, scale: 2 }), // 管理費率(%)
  purchaseTime: timestamp("purchase_time"), // 購入時間
  purchaseLocation: text("purchase_location"), // 購入地點
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("materials_name_idx").on(table.name),
  categoryIdx: index("materials_category_idx").on(table.category),
}));

// 產品配方表
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  totalPortions: integer("total_portions").notNull(),
  totalWeight: decimal("total_weight", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("recipes_name_idx").on(table.name),
  categoryIdx: index("recipes_category_idx").on(table.category),
}));

// 配方原料關聯表
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
});

// 原料分類表
export const materialCategories = pgTable("material_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 配方分類表
export const recipeCategories = pgTable("recipe_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 商品分類表
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 客製商品分類表
export const customProductCategories = pgTable("custom_product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 包裝分類表
export const packagingCategories = pgTable("packaging_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6B7280"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 包裝材料表
export const packaging = pgTable("packaging", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 販售商品表
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  managementFeePercentage: decimal("management_fee_percentage", { precision: 5, scale: 2 }).notNull().default("3.00"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 商品配方關聯表
export const productRecipes = pgTable("product_recipes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // "portions" or "grams"
});

// 商品包裝關聯表
export const productPackaging = pgTable("product_packaging", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  packagingId: integer("packaging_id").notNull().references(() => packaging.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
});

// 客製商品表
export const customProducts = pgTable("custom_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  managementFeePercentage: decimal("management_fee_percentage", { precision: 5, scale: 2 }).notNull().default("3.00"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 客製商品包含的販售商品關聯表
export const customProductItems = pgTable("custom_product_items", {
  id: serial("id").primaryKey(),
  customProductId: integer("custom_product_id").notNull().references(() => customProducts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
});

// 客製商品包裝關聯表
export const customProductPackaging = pgTable("custom_product_packaging", {
  id: serial("id").primaryKey(),
  customProductId: integer("custom_product_id").notNull().references(() => customProducts.id, { onDelete: "cascade" }),
  packagingId: integer("packaging_id").notNull().references(() => packaging.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
});

// 營養成分表
export const nutritionFacts = pgTable("nutrition_facts", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  calories: decimal("calories", { precision: 8, scale: 2 }), // per 100g
  protein: decimal("protein", { precision: 8, scale: 2 }), // per 100g
  fat: decimal("fat", { precision: 8, scale: 2 }), // per 100g
  saturatedFat: decimal("saturated_fat", { precision: 8, scale: 2 }), // per 100g
  transFat: decimal("trans_fat", { precision: 8, scale: 2 }), // per 100g
  carbohydrates: decimal("carbohydrates", { precision: 8, scale: 2 }), // per 100g
  sugar: decimal("sugar", { precision: 8, scale: 2 }), // per 100g
  sodium: decimal("sodium", { precision: 8, scale: 2 }), // per 100g (mg)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 使用者設定表
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  profitMarginLow: decimal("profit_margin_low", { precision: 5, scale: 2 }).notNull().default("20.00"),
  profitMarginHigh: decimal("profit_margin_high", { precision: 5, scale: 2 }).notNull().default("40.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 營養標示模板表
export const nutritionLabelTemplates = pgTable("nutrition_label_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  width: decimal("width", { precision: 6, scale: 2 }).notNull().default("20.00"), // cm
  height: decimal("height", { precision: 6, scale: 2 }).notNull().default("10.00"), // cm
  fontSize: decimal("font_size", { precision: 4, scale: 2 }).notNull().default("2.00"), // mm
  template: json("template").notNull(), // 模板配置
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 營養標示生成記錄表
export const nutritionLabels = pgTable("nutrition_labels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  recipeIds: text("recipe_ids").array().notNull(), // 使用的配方ID陣列
  servingSize: text("serving_size").notNull(), // 每份重量(g) - 改為支援數字和字串
  servingsPerPackage: integer("servings_per_package").notNull(), // 每包份數
  templateId: integer("template_id").references(() => nutritionLabelTemplates.id),
  calculatedNutrition: json("calculated_nutrition").notNull(), // 計算後的營養成分
  generatedFiles: json("generated_files"), // 生成的檔案路徑
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 台灣食品營養成分資料庫
export const taiwanNutritionDatabase = pgTable("taiwan_nutrition_database", {
  id: serial("id").primaryKey(),
  foodCode: text("food_code"), // 食品代碼
  foodName: text("food_name").notNull(), // 食品名稱
  category: text("category"), // 分類
  calories: decimal("calories", { precision: 8, scale: 2 }), // 熱量 kcal/100g
  protein: decimal("protein", { precision: 8, scale: 2 }), // 蛋白質 g/100g
  fat: decimal("fat", { precision: 8, scale: 2 }), // 脂肪 g/100g
  saturatedFat: decimal("saturated_fat", { precision: 8, scale: 2 }), // 飽和脂肪 g/100g
  transFat: decimal("trans_fat", { precision: 8, scale: 2 }), // 反式脂肪 g/100g
  carbohydrates: decimal("carbohydrates", { precision: 8, scale: 2 }), // 碳水化合物 g/100g
  sugar: decimal("sugar", { precision: 8, scale: 2 }), // 糖 g/100g
  sodium: decimal("sodium", { precision: 8, scale: 2 }), // 鈉 mg/100g
  fiber: decimal("fiber", { precision: 8, scale: 2 }), // 膳食纖維 g/100g
  calcium: decimal("calcium", { precision: 8, scale: 2 }), // 鈣 mg/100g
  iron: decimal("iron", { precision: 8, scale: 2 }), // 鐵 mg/100g
  vitaminA: decimal("vitamin_a", { precision: 8, scale: 2 }), // 維生素A μg/100g
  vitaminC: decimal("vitamin_c", { precision: 8, scale: 2 }), // 維生素C mg/100g
  sourceNote: text("source_note"), // 資料來源備註
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 原料與台灣營養資料庫的對應關係
export const materialNutritionMapping = pgTable("material_nutrition_mapping", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  taiwanNutritionId: integer("taiwan_nutrition_id").notNull().references(() => taiwanNutritionDatabase.id, { onDelete: "cascade" }),
  mappingNote: text("mapping_note"), // 對應備註
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 原料異動履歷表
export const materialHistory = pgTable("material_history", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  // 異動前後的欄位快照
  previousData: json("previous_data"), // 異動前的資料
  newData: json("new_data"), // 異動後的資料
  changedFields: text("changed_fields").array(), // 變更的欄位名稱列表
  changeDescription: text("change_description"), // 變更描述
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const materialsRelations = relations(materials, ({ many, one }) => ({
  recipeIngredients: many(recipeIngredients),
  nutritionFacts: one(nutritionFacts),
  history: many(materialHistory),
  nutritionMapping: many(materialNutritionMapping),
}));

export const materialHistoryRelations = relations(materialHistory, ({ one }) => ({
  material: one(materials, {
    fields: [materialHistory.materialId],
    references: [materials.id],
  }),
}));

export const nutritionLabelTemplatesRelations = relations(nutritionLabelTemplates, ({ many }) => ({
  nutritionLabels: many(nutritionLabels),
}));

export const nutritionLabelsRelations = relations(nutritionLabels, ({ one }) => ({
  template: one(nutritionLabelTemplates, {
    fields: [nutritionLabels.templateId],
    references: [nutritionLabelTemplates.id],
  }),
}));

export const taiwanNutritionDatabaseRelations = relations(taiwanNutritionDatabase, ({ many }) => ({
  materialMappings: many(materialNutritionMapping),
}));

export const materialNutritionMappingRelations = relations(materialNutritionMapping, ({ one }) => ({
  material: one(materials, {
    fields: [materialNutritionMapping.materialId],
    references: [materials.id],
  }),
  taiwanNutrition: one(taiwanNutritionDatabase, {
    fields: [materialNutritionMapping.taiwanNutritionId],
    references: [taiwanNutritionDatabase.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
  productRecipes: many(productRecipes),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  material: one(materials, {
    fields: [recipeIngredients.materialId],
    references: [materials.id],
  }),
}));

export const packagingRelations = relations(packaging, ({ many }) => ({
  productPackaging: many(productPackaging),
  customProductPackaging: many(customProductPackaging),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productRecipes: many(productRecipes),
  productPackaging: many(productPackaging),
  customProductItems: many(customProductItems),
}));

export const customProductsRelations = relations(customProducts, ({ many }) => ({
  customProductItems: many(customProductItems),
  customProductPackaging: many(customProductPackaging),
}));

export const customProductItemsRelations = relations(customProductItems, ({ one }) => ({
  customProduct: one(customProducts, {
    fields: [customProductItems.customProductId],
    references: [customProducts.id],
  }),
  product: one(products, {
    fields: [customProductItems.productId],
    references: [products.id],
  }),
}));

export const customProductPackagingRelations = relations(customProductPackaging, ({ one }) => ({
  customProduct: one(customProducts, {
    fields: [customProductPackaging.customProductId],
    references: [customProducts.id],
  }),
  packaging: one(packaging, {
    fields: [customProductPackaging.packagingId],
    references: [packaging.id],
  }),
}));

export const productRecipesRelations = relations(productRecipes, ({ one }) => ({
  product: one(products, {
    fields: [productRecipes.productId],
    references: [products.id],
  }),
  recipe: one(recipes, {
    fields: [productRecipes.recipeId],
    references: [recipes.id],
  }),
}));

export const productPackagingRelations = relations(productPackaging, ({ one }) => ({
  product: one(products, {
    fields: [productPackaging.productId],
    references: [products.id],
  }),
  packaging: one(packaging, {
    fields: [productPackaging.packagingId],
    references: [packaging.id],
  }),
}));

export const nutritionFactsRelations = relations(nutritionFacts, ({ one }) => ({
  material: one(materials, {
    fields: [nutritionFacts.materialId],
    references: [materials.id],
  }),
}));

// Insert schemas
export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({
  id: true,
});

export const insertMaterialCategorySchema = createInsertSchema(materialCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeCategorySchema = createInsertSchema(recipeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomProductCategorySchema = createInsertSchema(customProductCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPackagingCategorySchema = createInsertSchema(packagingCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPackagingSchema = createInsertSchema(packaging).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductRecipeSchema = createInsertSchema(productRecipes).omit({
  id: true,
});

export const insertProductPackagingSchema = createInsertSchema(productPackaging).omit({
  id: true,
});

export const insertCustomProductSchema = createInsertSchema(customProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomProductItemSchema = createInsertSchema(customProductItems).omit({
  id: true,
  customProductId: true,
});

export const insertCustomProductPackagingSchema = createInsertSchema(customProductPackaging).omit({
  id: true,
  customProductId: true,
});

export const insertNutritionFactsSchema = createInsertSchema(nutritionFacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialHistorySchema = createInsertSchema(materialHistory).omit({
  id: true,
  createdAt: true,
});

export const insertNutritionLabelTemplateSchema = createInsertSchema(nutritionLabelTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNutritionLabelSchema = createInsertSchema(nutritionLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaiwanNutritionDatabaseSchema = createInsertSchema(taiwanNutritionDatabase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialNutritionMappingSchema = createInsertSchema(materialNutritionMapping).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema> & {
  purchaseTime?: string | Date | null;
};

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;

export type MaterialCategory = typeof materialCategories.$inferSelect;
export type InsertMaterialCategory = z.infer<typeof insertMaterialCategorySchema>;

export type RecipeCategory = typeof recipeCategories.$inferSelect;
export type InsertRecipeCategory = z.infer<typeof insertRecipeCategorySchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

export type CustomProductCategory = typeof customProductCategories.$inferSelect;
export type InsertCustomProductCategory = z.infer<typeof insertCustomProductCategorySchema>;

export type PackagingCategory = typeof packagingCategories.$inferSelect;
export type InsertPackagingCategory = z.infer<typeof insertPackagingCategorySchema>;

export type Packaging = typeof packaging.$inferSelect;
export type InsertPackaging = z.infer<typeof insertPackagingSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductRecipe = typeof productRecipes.$inferSelect;
export type InsertProductRecipe = z.infer<typeof insertProductRecipeSchema>;

export type ProductPackaging = typeof productPackaging.$inferSelect;
export type InsertProductPackaging = z.infer<typeof insertProductPackagingSchema>;

export type CustomProduct = typeof customProducts.$inferSelect;
export type InsertCustomProduct = z.infer<typeof insertCustomProductSchema>;

export type CustomProductItem = typeof customProductItems.$inferSelect;
export type InsertCustomProductItem = z.infer<typeof insertCustomProductItemSchema>;

export type CustomProductPackaging = typeof customProductPackaging.$inferSelect;
export type InsertCustomProductPackaging = z.infer<typeof insertCustomProductPackagingSchema>;

export type NutritionFacts = typeof nutritionFacts.$inferSelect;
export type InsertNutritionFacts = z.infer<typeof insertNutritionFactsSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type MaterialHistory = typeof materialHistory.$inferSelect;
export type InsertMaterialHistory = z.infer<typeof insertMaterialHistorySchema>;

// Extended types for API responses
export type RecipeWithIngredients = Recipe & {
  ingredients: (RecipeIngredient & { material: Material })[];
  totalCost?: number;
  costPerPortion?: number;
  costPerGram?: number;
};

export type ProductWithDetails = Product & {
  recipes: (ProductRecipe & { recipe: RecipeWithIngredients })[];
  packaging: (ProductPackaging & { packaging: Packaging })[];
  totalCost?: number;
  managementFee?: number;
  adjustedCost?: number;
  profit?: number;
  profitMargin?: number;
};

export type CustomProductWithDetails = CustomProduct & {
  items: (CustomProductItem & { product: ProductWithDetails })[];
  packaging: (CustomProductPackaging & { packaging: Packaging })[];
  totalCost?: number;
  managementFee?: number;
  adjustedCost?: number;
  profit?: number;
  profitMargin?: number;
};

export type MaterialWithNutrition = Material & {
  nutritionFacts?: NutritionFacts;
};

export type MaterialWithHistory = Material & {
  nutritionFacts?: NutritionFacts;
  history?: MaterialHistory[];
};

export type RecipeNutrition = {
  recipeId: number;
  recipeName: string;
  portionWeight: number;
  calories: number;
  protein: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  carbohydrates: number;
  sugar: number;
  sodium: number;
};



// 營養標示相關的新類型
export type NutritionLabelTemplate = typeof nutritionLabelTemplates.$inferSelect;
export type InsertNutritionLabelTemplate = z.infer<typeof insertNutritionLabelTemplateSchema>;

export type NutritionLabel = typeof nutritionLabels.$inferSelect;
export type InsertNutritionLabel = z.infer<typeof insertNutritionLabelSchema>;

export type TaiwanNutritionDatabase = typeof taiwanNutritionDatabase.$inferSelect;
export type InsertTaiwanNutritionDatabase = z.infer<typeof insertTaiwanNutritionDatabaseSchema>;

export type MaterialNutritionMapping = typeof materialNutritionMapping.$inferSelect;
export type InsertMaterialNutritionMapping = z.infer<typeof insertMaterialNutritionMappingSchema>;

// 營養標示計算結果類型
export type CalculatedNutrition = {
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
  servingSize: number; // g
  servingsPerPackage: number;
  totalWeight: number; // g
};

// 營養標示模板配置類型
export type NutritionLabelTemplateConfig = {
  layout: 'vertical' | 'horizontal';
  showBorder: boolean;
  borderWidth: number;
  backgroundColor: string;
  textColor: string;
  headerFontSize: number;
  bodyFontSize: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  spacing: {
    lineHeight: number;
    sectionSpacing: number;
  };
};

// 包含營養資料庫對應的原料類型
export type MaterialWithNutritionMapping = Material & {
  nutritionFacts?: NutritionFacts;
  nutritionMapping?: MaterialNutritionMapping & {
    taiwanNutrition: TaiwanNutritionDatabase;
  };
};
