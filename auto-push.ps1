# ============================================================
# auto-push.ps1
# 后台监听 国家选择器.user.js，有改动自动 git commit + push
# 由 Windows 任务计划程序开机自动后台运行，无需手动启动
# ============================================================

$repoPath  = "C:\Users\o-park.chen\Desktop\国家选择器"
$watchFile = "国家选择器.user.js"
$logFile   = "$repoPath\auto-push.log"
$debounceS = 5  # 防抖：文件保存后等 5 秒再推送

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    # 日志文件只保留最近 500 行，防止无限增长
    if (Test-Path $logFile) {
        $lines = Get-Content $logFile -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($lines.Count -gt 500) {
            $lines = $lines[-400..-1]
            Set-Content $logFile -Value $lines -Encoding UTF8
        }
    }
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

Write-Log "=== 自动推送守护进程启动 ==="
Write-Log "监听: $repoPath\$watchFile"

# 用 FileSystemWatcher 监听文件变化（比轮询更精准）
$watcher              = New-Object System.IO.FileSystemWatcher
$watcher.Path         = $repoPath
$watcher.Filter       = $watchFile
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite
$watcher.EnableRaisingEvents = $true

$lastTriggered = [datetime]::MinValue

function Do-Push {
    $now = Get-Date
    # 防抖：距上次触发不足 debounceS 秒则忽略
    if (($now - $script:lastTriggered).TotalSeconds -lt $debounceS) { return }
    $script:lastTriggered = $now

    # 等编辑器完成写入
    Start-Sleep -Seconds 2

    Write-Log "检测到文件变化，开始推送..."

    Set-Location $repoPath
    git add $watchFile 2>&1 | Out-Null

    $diff = git diff --cached --name-only 2>&1
    if ($diff -match "user\.js") {
        $ts = Get-Date -Format "yyyy-MM-dd HH:mm"
        git commit -m "auto: $ts" 2>&1 | Out-Null
        $pushOut = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "推送成功！"
        } else {
            Write-Log "推送失败：$pushOut"
        }
    } else {
        Write-Log "无实际变化，跳过。"
    }
}

# 注册文件变化事件
$job = Register-ObjectEvent -InputObject $watcher -EventName Changed -Action {
    Do-Push
}

Write-Log "初始化完成，等待文件变化..."

# 保持进程存活
try {
    while ($true) { Start-Sleep -Seconds 10 }
} finally {
    Unregister-Event -SourceIdentifier $job.Name -ErrorAction SilentlyContinue
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Write-Log "守护进程已停止。"
}
