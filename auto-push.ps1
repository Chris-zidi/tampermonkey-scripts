# auto-push.ps1
# Watches for changes to the userscript and auto git-commits + pushes

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$repoPath  = "C:\Users\o-park.chen\Desktop\国家选择器"
$watchFile = "国家选择器.user.js"
$logFile   = Join-Path $repoPath "auto-push.log"
$debounceS = 5

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    try {
        Add-Content -Path $logFile -Value $line -Encoding UTF8
    } catch {}
    Write-Host $line
}

Write-Log "=== Auto-push daemon started ==="
Write-Log "Repo: $repoPath"
Write-Log "Watching: $watchFile"

if (-not $watchFile) {
    Write-Log "ERROR: No .user.js file found in $repoPath"
    exit 1
}

$filePath = Join-Path $repoPath $watchFile
$lastMod  = (Get-Item $filePath).LastWriteTime
$lastPush = [datetime]::MinValue

Write-Log "Initial timestamp: $lastMod"
Write-Log "Waiting for changes..."

while ($true) {
    Start-Sleep -Seconds 2

    try {
        $currentMod = (Get-Item $filePath).LastWriteTime

        if ($currentMod -gt $lastMod) {
            $lastMod = $currentMod
            $now = Get-Date

            # debounce
            if (($now - $lastPush).TotalSeconds -lt $debounceS) {
                continue
            }

            Write-Log "Change detected, waiting for editor to finish..."
            Start-Sleep -Seconds 3

            Write-Log "Starting git push..."
            Set-Location $repoPath

            $addOut = git add $watchFile 2>&1
            $diff   = git diff --cached --name-only 2>&1

            if ($diff) {
                $ts = Get-Date -Format "yyyy-MM-dd HH:mm"
                $commitOut = git commit -m "auto: $ts" 2>&1
                $pushOut   = git push origin main 2>&1

                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Push OK"
                    $lastPush = Get-Date
                } else {
                    Write-Log "Push FAILED: $pushOut"
                }
            } else {
                Write-Log "No staged changes, skipping."
            }
        }
    } catch {
        Write-Log "Error: $_"
    }
}
