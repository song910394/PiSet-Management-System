#!/bin/bash
# === PiSet 自動備份腳本 ===
cd /home/runner/workspace

# 1️⃣ 建立每日壓縮檔（排除 node_modules、備份資料夾）
zip -r "backup-\$(date +%Y-%m-%d).zip" . -x "node_modules/*" "backup-*/*" "__pycache__/*" "*.log" ".cache/*" "attached_assets/*" ".git/*"

# 2️⃣ 加入 Git 並提交
git add .
git commit -m "Auto backup: \$(date)"

# 3️⃣ 推送到 GitHub
git push origin main

echo "✅ PiSet 管理系統每日自動備份完成！"

