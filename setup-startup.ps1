# setup-startup.ps1
# 把 auto-push.ps1 注册为开机自启动（注册表，无需管理员）
# 并立即在后台运行一次

$scriptDest = "C:\AutoPush\auto-push.ps1"
$regPath    = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$regName    = "ChrisAutoPush"
$cmd        = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptDest`""

# 写入注册表
Set-ItemProperty -Path $regPath -Name $regName -Value $cmd
Write-Host "Startup entry added: $regName" -ForegroundColor Green
Write-Host "Command: $cmd" -ForegroundColor Gray

# 立即后台启动
Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptDest`"" -WindowStyle Hidden
Write-Host "Daemon started in background." -ForegroundColor Cyan
Write-Host "Check log at: C:\AutoPush\auto-push.log" -ForegroundColor Yellow
