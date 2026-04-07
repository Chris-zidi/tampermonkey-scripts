# ============================================================
# auto-push.ps1
# 监听 国家选择器.user.js 文件变化，自动 git commit + push
# ============================================================

$repoPath   = Split-Path -Parent $MyInvocation.MyCommand.Path
$watchFile  = "国家选择器.user.js"
$debounceMs = 3000   # 防抖：文件保存后等 3 秒再推送

Write-Host "=== 国家选择器 自动推送守护进程 ===" -ForegroundColor Cyan
Write-Host "监听目录: $repoPath" -ForegroundColor Gray
Write-Host "监听文件: $watchFile" -ForegroundColor Gray
Write-Host "文件保存后将自动 commit + push 到 GitHub" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止" -ForegroundColor Yellow
Write-Host ""

# 上次触发时间（防抖用）
$lastTriggered = [datetime]::MinValue

# 设置 FileSystemWatcher
$watcher              = New-Object System.IO.FileSystemWatcher
$watcher.Path         = $repoPath
$watcher.Filter       = $watchFile
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite
$watcher.EnableRaisingEvents = $true

function Do-Push {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    Write-Host ""
    Write-Host "[$timestamp] 检测到文件变化，正在推送..." -ForegroundColor Cyan

    Set-Location $repoPath

    git add "国家选择器.user.js" 2>&1 | Out-Null

    # 检查是否有实际改动
    $diff = git diff --cached --name-only 2>&1
    if ($diff -match "user.js") {
        git commit -m "auto: $timestamp" 2>&1 | Out-Null
        $pushResult = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "推送成功！" -ForegroundColor Green
        } else {
            Write-Host "推送失败：$pushResult" -ForegroundColor Red
        }
    } else {
        Write-Host "没有实际变化，跳过推送。" -ForegroundColor Gray
    }
}

# 主循环：每 500ms 检查一次是否有待处理的事件
try {
    while ($true) {
        $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::Changed, 500)

        if (-not $result.TimedOut) {
            $now = Get-Date
            # 防抖：距上次触发超过 debounceMs 才执行
            if (($now - $lastTriggered).TotalMilliseconds -gt $debounceMs) {
                $lastTriggered = $now
                # 再等一会儿，让编辑器完成写入
                Start-Sleep -Milliseconds 1000
                Do-Push
            }
        }
    }
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Write-Host "监听已停止。" -ForegroundColor Yellow
}
