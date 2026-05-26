# Agente de nomina por Telegram

Este agente escucha mensajes de Telegram, modifica el archivo `Nomina_Agentica_Colombia_2026.xlsx` y puede reenviarlo actualizado.

## 1. Crear el bot

1. En Telegram abre `@BotFather`.
2. Ejecuta `/newbot`.
3. Copia el token que entrega BotFather.

## 2. Configurar variables en PowerShell

```powershell
$env:TELEGRAM_BOT_TOKEN="TU_TOKEN_DE_BOTFATHER"
```

Opcional, para permitir solo tu chat:

```powershell
$env:TELEGRAM_ALLOWED_CHAT_ID="TU_CHAT_ID"
```

Si no sabes tu `chat_id`, ejecuta el agente, escríbele al bot y revisa la consola o deja la variable sin configurar mientras pruebas.

## 3. Ejecutar el agente

```powershell
& 'C:\Users\Janus\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' telegram_payroll_agent.py
```

Deja esa ventana abierta mientras quieras que el bot responda.

## Comandos soportados

- `ayuda`
- `enviame el excel`
- `resumen de nomina`
- `agrega 5 empleados con salario minimo`
- `cambia salario EMP-0003 a 2500000`
- `simula aumento del 10%`
- `valida errores`

Cada cambio crea una copia de seguridad en `backups/`.

## Nota

El archivo se marca para recalcular al abrir en Excel. Las formulas del libro siguen siendo la fuente principal del calculo visual; el bot usa calculos internos para responder resumenes rapidos por Telegram.
