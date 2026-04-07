@echo off
chcp 65001 >nul
title 国家选择器 - 自动推送守护进程
echo 正在启动自动推送守护进程...
echo 此窗口请保持开启，关闭后自动推送将停止。
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0auto-push.ps1"
pause
