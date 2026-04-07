# register-task.ps1
$taskName   = "ChrisAutoPush"
$scriptPath = "C:\Users\o-park.chen\Desktop\国家选择器\auto-push.ps1"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit 0 `
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
    -Force | Out-Null

Write-Host "Task registered OK" -ForegroundColor Green
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "LastRunTime: $($info.LastRunTime)" -ForegroundColor Cyan
Write-Host "LastTaskResult: $($info.LastTaskResult)" -ForegroundColor Cyan
