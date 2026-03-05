#!/usr/bin/env powershell
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ServerUrl,

  [Parameter(Mandatory = $true)]
  [string]$DeviceToken,

  [string]$DeviceId = $env:COMPUTERNAME,
  [int]$Interval = 60,
  [string]$TaskName = "ServidorUnificado_USBPrinterAgent"
)

$ErrorActionPreference = "Stop"

function Log-Info($Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Log-Ok($Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Log-Err($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

try {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    throw "Execute este script como Administrador."
  }

  $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
  if (-not $pythonCmd) {
    throw "Python nao encontrado. Instale Python 3 e tente novamente."
  }

  $pythonExe = $pythonCmd.Source
  $pythonDir = Split-Path -Parent $pythonExe
  $pythonwExe = Join-Path $pythonDir "pythonw.exe"
  if (-not (Test-Path $pythonwExe)) {
    $pythonwExe = $pythonExe
  }

  Log-Info "Python: $pythonExe"

  & $pythonExe -m pip install --upgrade pip requests | Out-Host

  $baseDir = "C:\ProgramData\ServidorUnificado\usb-printer-agent"
  $agentPath = Join-Path $baseDir "usb_printer_agent.py"

  New-Item -ItemType Directory -Path $baseDir -Force | Out-Null

  $sourceAgent = Join-Path $PSScriptRoot "..\agents\usb_printer_agent.py"
  if (-not (Test-Path $sourceAgent)) {
    throw "Arquivo nao encontrado: $sourceAgent"
  }

  Copy-Item -Path $sourceAgent -Destination $agentPath -Force
  Log-Ok "Agente copiado para $agentPath"

  $argList = @(
    "`"$agentPath`"",
    "--server", "`"$ServerUrl`"",
    "--token", "`"$DeviceToken`"",
    "--device-id", "`"$DeviceId`"",
    "--interval", "$Interval"
  ) -join " "

  $action = New-ScheduledTaskAction -Execute $pythonwExe -Argument $argList
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Log-Info "Task anterior removida: $TaskName"
  }

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
  Start-ScheduledTask -TaskName $TaskName

  Log-Ok "Task instalada e iniciada: $TaskName"
  Log-Info "Status: Get-ScheduledTask -TaskName '$TaskName'"
  Log-Info "Execucao atual: Get-ScheduledTaskInfo -TaskName '$TaskName'"
}
catch {
  Log-Err $_.Exception.Message
  exit 1
}

