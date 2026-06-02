Set-Location $PSScriptRoot

& "C:\nvm4w\nodejs\node_modules\bun\bin\bun.exe" run dev -- --host 127.0.0.1 *>&1 |
  Tee-Object -FilePath "$PSScriptRoot\server.all.log"
