@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在提交并推送到 GitHub...

git add .

:: 用当前时间作为 commit 信息
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set D=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set T=%%a:%%b
git commit -m "update: %D% %T%"

git push origin main

echo.
echo 推送完成！Tampermonkey 下次检查时会自动更新。
pause
