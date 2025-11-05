#!/bin/bash

# 每日Git推送腳本
# 使用方法：在Shell中執行 bash git-push.sh

echo "================================"
echo "開始推送專案到GitHub..."
echo "================================"

# 添加所有變更
echo "1. 添加所有變更..."
git add .

# 顯示狀態
echo ""
echo "2. 當前Git狀態："
git status

# 提交變更
COMMIT_MSG="Auto backup - $(TZ='Asia/Taipei' date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "3. 提交變更：$COMMIT_MSG"
git commit -m "$COMMIT_MSG" || echo "沒有新的變更需要提交"

# 推送到GitHub
echo ""
echo "4. 推送到GitHub..."
git push origin main || git push origin master

echo ""
echo "================================"
echo "✅ 推送完成！"
echo "================================"
