# register-task.ps1
$scriptPath = "C:\Users\o-park.chen\Desktop\国家选择器\auto-push.ps1"
$taskName   = "ChrisAutoPush"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit 0 `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 2) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Auto push userscript to GitHub on file change" `
    -Force

Write-Host "Task '$taskName' registered OK" -ForegroundColor Green
Start-ScheduledTask -TaskName $taskName
Write-Host "Task started in background. It will auto-start on every login." -ForegroundColor Cyan
