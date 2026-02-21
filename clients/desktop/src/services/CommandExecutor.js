// clients/desktop/src/services/CommandExecutor.js
// CORREÇÃO: Campos alinhados com o que o servidor retorna:
//   cmd.command         (não command_text)
//   cmd.requiresElevation (não requires_elevation)
//   cmd.id              (não _id)

const { exec, execFile } = require('child_process');
const os = require('os');
const path = require('path');

class CommandExecutor {
  constructor(logger) {
    this._logger = logger || console;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // execute(cmd)
  // cmd vem do servidor — campos conforme AssetCommand schema:
  //   cmd.id               → string (ObjectId do comando)
  //   cmd.command          → string (texto do comando a executar)
  //   cmd.command_type     → string (enum: cmd_custom, powershell_custom, etc.)
  //   cmd.requiresElevation → boolean
  // ──────────────────────────────────────────────────────────────────────────
  async execute(cmd) {
    // Suporte a ambos os formatos (novo: cmd.command / legado: cmd.command_text)
    const commandText = cmd.command || cmd.command_text || '';
    const commandId   = cmd.id      || cmd._id          || '';
    const elevated    = cmd.requiresElevation ?? cmd.requires_elevation ?? false;
    const commandType = cmd.command_type || 'cmd_custom';

    this._logger.info(`[CommandExecutor] Executando cmd ${commandId} (tipo: ${commandType}, elevado: ${elevated})`);

    if (!commandText && !this._isPredefinedType(commandType)) {
      return {
        success: false,
        result: { stdout: '', stderr: 'Texto do comando ausente', exitCode: 1 },
      };
    }

    try {
      let result;

      switch (commandType) {
        case 'powershell_custom':
          result = await this._runPowershell(commandText, elevated);
          break;

        case 'restart_computer':
          result = await this._runShell('shutdown /r /t 0', false);
          break;

        case 'shutdown_computer':
          result = await this._runShell('shutdown /s /t 0', false);
          break;

        case 'flush_dns':
          result = await this._runShell('ipconfig /flushdns', false);
          break;

        case 'map_lpt2': {
          // Parâmetros extras em cmd.parameters (objeto JSON)
          const params = cmd.parameters || {};
          const printerPath = params.printer_path || commandText;
          result = await this._runShell(`net use LPT2 "${printerPath}" /persistent:yes`, false);
          break;
        }

        case 'cmd_custom':
        default:
          result = await this._runShell(commandText, elevated);
          break;
      }

      return { success: true, result };
    } catch (error) {
      this._logger.error(`[CommandExecutor] Falha: ${error.message}`);
      return {
        success: false,
        result: { stdout: '', stderr: error.message, exitCode: 1 },
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers internos
  // ──────────────────────────────────────────────────────────────────────────
  _isPredefinedType(type) {
    const predefined = [
      'restart_computer', 'shutdown_computer', 'flush_dns', 'lock_screen',
      'map_lpt2', 'unmap_lpt2', 'open_notepad', 'close_notepad',
    ];
    return predefined.includes(type);
  }

  _runShell(command, elevated) {
    return new Promise((resolve, reject) => {
      const finalCmd = elevated && os.platform() === 'win32'
        ? `runas /user:Administrator "${command}"`
        : command;

      exec(finalCmd, { timeout: 30_000 }, (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(error);
          return;
        }
        resolve({
          stdout:        stdout   || '',
          stderr:        stderr   || '',
          exitCode:      error ? error.code || 1 : 0,
          executionTime: 0,
        });
      });
    });
  }

  _runPowershell(script, elevated) {
    return new Promise((resolve, reject) => {
      const args = [
        '-NonInteractive',
        '-NoProfile',
        elevated ? '-ExecutionPolicy', 'Bypass' : '-ExecutionPolicy', 'RemoteSigned',
        '-Command', script,
      ];

      let stdout = '';
      let stderr = '';
      const ps = execFile('powershell.exe', args, { timeout: 60_000 });

      ps.stdout.on('data', (d) => { stdout += d; });
      ps.stderr.on('data', (d) => { stderr += d; });

      ps.on('close', (code) => {
        resolve({
          stdout:        stdout.trim(),
          stderr:        stderr.trim(),
          exitCode:      code ?? 0,
          executionTime: 0,
        });
      });

      ps.on('error', reject);
    });
  }
}

module.exports = CommandExecutor;
