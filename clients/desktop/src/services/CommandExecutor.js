/**
 * CommandExecutor.js
 * Responsável por executar comandos no sistema e reportar resultados
 * Extraído de: CommandPoller.js → fetchPendingCommands, reportCommandResult, _runCommand
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const APIClient = require('./APIClient');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runCommand(command, options = {}) {
    const timeout = options.timeout || 60000;
    const requiresElevation = options.requiresElevation || false;

    if (requiresElevation) {
        // Cria script .bat temporário e executa com RunAs
        const tmpBat = path.join(os.tmpdir(), `temp_command_${Date.now()}.bat`);
        return new Promise(resolve => {
            try {
                fs.writeFileSync(tmpBat, `@echo off\n${command}\n`);
                exec(
                    `powershell -Command "Start-Process -FilePath '${tmpBat}' -Verb RunAs -Wait"`,
                    { timeout },
                    (err, stdout, stderr) => {
                        try { fs.unlinkSync(tmpBat); } catch (_) { }
                        resolve({
                            stdout: (stdout || '').trim(),
                            stderr: (err?.message || stderr || '').trim(),
                            exitCode: err?.code ?? 0,
                        });
                    }
                );
            } catch (e) {
                resolve({ stdout: '', stderr: e.message, exitCode: -1 });
            }
        });
    } else {
        // Execução normal
        return new Promise(resolve => {
            const start = Date.now();
            exec(command, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                const executionTime = Date.now() - start;
                resolve({
                    stdout: (stdout || '').trim(),
                    stderr: (err?.message || stderr || '').trim(),
                    exitCode: err?.code ?? 0,
                    executionTime,
                });
            });
        });
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND POLLING & EXECUTION CYCLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executePendingCommands(serverUrl, moduleId, serialNumber, token) {
    try {
        console.log('[CommandExecutor] 🔄 Verificando comandos pendentes...');

        const commands = await APIClient.fetchPendingCommands(
            serverUrl,
            moduleId,
            serialNumber,
            token
        );

        if (commands.length === 0) {
            console.log('[CommandExecutor] ✅ Nenhum comando pendente');
            return 0;
        }

        console.log(`[CommandExecutor] 📋 ${commands.length} comando(s) encontrado(s)`);

        let executedCount = 0;
        for (const cmd of commands) {
            try {
                console.log(`[CommandExecutor] ▶️ Executando: ${cmd.command_text}`);

                const start = Date.now();
                const result = await runCommand(cmd.command_text, {
                    timeout: cmd.timeout || 60000,
                    requiresElevation: cmd.requires_elevation || false,
                });
                const executionTime = Date.now() - start;

                // Reportar resultado
                await APIClient.reportCommandResult(
                    serverUrl,
                    moduleId,
                    cmd._id || cmd.id,
                    token,
                    {
                        success: result.exitCode === 0,
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode,
                        executionTime,
                    }
                );

                executedCount++;
                console.log(`[CommandExecutor] ✅ Comando executado: ${cmd.command_text}`);
            } catch (error) {
                console.error('[CommandExecutor] ❌ Erro ao executar comando:', error.message);
                // Continua com próximo comando
            }
        }

        console.log(`[CommandExecutor] ✅ Execução completa: ${executedCount}/${commands.length} comandos`);
        return executedCount;
    } catch (error) {
        console.error('[CommandExecutor] ❌ Erro no ciclo de execução:', error.message);
        return 0;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports = {
    runCommand,
    executePendingCommands,
};
