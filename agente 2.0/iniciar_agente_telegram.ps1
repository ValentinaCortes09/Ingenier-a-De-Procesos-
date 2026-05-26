$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = "C:\Users\Janus\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

Set-Location $projectDir

if (-not $env:TELEGRAM_BOT_TOKEN) {
    $secureToken = Read-Host "Pega el token NUEVO de BotFather" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    try {
        $env:TELEGRAM_BOT_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

Write-Host "Iniciando agente desde $projectDir"
Write-Host "Cuando le escribas al bot, aqui aparecera tu chat_id."
& $pythonExe "$projectDir\telegram_payroll_agent.py"
