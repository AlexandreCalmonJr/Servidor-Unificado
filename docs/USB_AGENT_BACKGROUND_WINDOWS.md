# USB Agent Oculto no Windows

Este modo executa o `usb_printer_agent.py` em segundo plano, sem janela para o usuário, via `Task Scheduler` rodando como `SYSTEM`.

## 1) Instalar

Abra o PowerShell como Administrador na raiz do projeto e rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install_usb_agent_windows_task.ps1 `
  -ServerUrl "http://SEU_SERVIDOR:3000" `
  -DeviceToken "SEU_TOKEN" `
  -DeviceId "PC-RECEPCAO-01" `
  -Interval 60
```

## 2) Verificar

```powershell
Get-ScheduledTask -TaskName "ServidorUnificado_USBPrinterAgent"
Get-ScheduledTaskInfo -TaskName "ServidorUnificado_USBPrinterAgent"
```

## 3) Reiniciar task

```powershell
Stop-ScheduledTask -TaskName "ServidorUnificado_USBPrinterAgent"
Start-ScheduledTask -TaskName "ServidorUnificado_USBPrinterAgent"
```

## 4) Remover

```powershell
Unregister-ScheduledTask -TaskName "ServidorUnificado_USBPrinterAgent" -Confirm:$false
```

