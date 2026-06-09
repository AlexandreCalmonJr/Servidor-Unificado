// clients/desktop/src/services/CommandExecutor.js
// CORREÇÃO: Campos alinhados com o que o servidor retorna:
//   cmd.command         (não command_text)
//   cmd.requiresElevation (não requires_elevation)
//   cmd.id              (não _id)

const { exec, execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function normalizeForSignature(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeForSignature);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = normalizeForSignature(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function canonicalizeCommand(command) {
  const payload = {
    id: String(command.id || command._id || ''),
    commandType: String(command.commandType || command.command_type || ''),
    command: String(command.command || command.command_text || ''),
    parameters: normalizeForSignature(command.parameters || {}),
    requiresElevation: Boolean(command.requiresElevation ?? command.requires_elevation ?? false),
    timeout: Number(command.timeout || 0),
  };
  return JSON.stringify(normalizeForSignature(payload));
}

function loadPublicKey() {
  const inline = process.env.COMMAND_SIGNING_PUBLIC_KEY;
  if (inline) return inline.replace(/\\n/g, '\n').trim();

  const candidates = [
    path.join(__dirname, '..', '..', 'command_public_key.pem'),
    path.join(process.resourcesPath || '', 'command_public_key.pem'),
  ];

  for (const filePath of candidates) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (_) {
      // Ignore unreadable optional public key paths.
    }
  }

  return '';
}

class CommandExecutor {
  constructor(logger) {
    this._logger = logger || console;
    this._publicKey = loadPublicKey();
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
    const commandId = cmd.id || cmd._id || '';
    const elevated = cmd.requiresElevation ?? cmd.requires_elevation ?? false;
    const commandType = cmd.commandType || cmd.command_type || 'cmd_custom';

    this._logger.info(`[CommandExecutor] Executando cmd ${commandId} (tipo: ${commandType}, elevado: ${elevated})`);

    if (!this._isCommandAuthorized(cmd, commandType)) {
      return {
        success: false,
        result: { stdout: '', stderr: 'Comando sem assinatura valida', exitCode: 1 },
      };
    }

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

        case 'install_exe':
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
      'restart_print_spooler', 'clear_temp', 'check_disk', 'network_reset',
      'restart_automatos', 'restart_ndd', 'install_update',
    ];
    return predefined.includes(type);
  }

  _isDangerousType(type) {
    return [
      'cmd_custom',
      'powershell_custom',
      'custom_script',
      'install_exe',
      'download_file',
      'auto_start_app',
    ].includes(type);
  }

  _isCommandAuthorized(cmd, commandType) {
    const allowUnsignedCustom = String(process.env.MDM_ALLOW_UNSIGNED_CUSTOM_COMMANDS || '').toLowerCase() === 'true';
    const signature = cmd.signature || cmd.commandSignature;

    if (this._publicKey) {
      if (!signature) return false;
      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(canonicalizeCommand(cmd));
        verifier.end();
        return verifier.verify(this._publicKey, signature, 'base64');
      } catch (error) {
        this._logger.warn(`[CommandExecutor] Assinatura invalida: ${error.message}`);
        return false;
      }
    }

    if (this._isDangerousType(commandType)) {
      if (allowUnsignedCustom) {
        this._logger.warn('[CommandExecutor] Executando comando customizado sem assinatura por override local');
        return true;
      }
      return false;
    }

    return this._isPredefinedType(commandType);
  }

  _runShell(command, elevated) {
    return new Promise((resolve, reject) => {
      // NOTE: runas requires interactive password prompt in basic usage, which breaks silent MDM.
      // If the service is running as SYSTEM/Admin, it doesn't need runas.
      // If we use runas here, it will hang waiting for a password. Removing it for background service context.
      const finalCmd = command;

      exec(finalCmd, { timeout: 600_000 }, (error, stdout, stderr) => { // 10 minutes timeout for installers
        if (error && !stdout) {
          reject(error);
          return;
        }
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? error.code || 1 : 0,
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
        ...(elevated ? ['-ExecutionPolicy', 'Bypass'] : ['-ExecutionPolicy', 'RemoteSigned']),
        '-Command', script,
      ];

      let stdout = '';
      let stderr = '';
      const ps = execFile('powershell.exe', args, { timeout: 60_000 });

      ps.stdout.on('data', (d) => { stdout += d; });
      ps.stderr.on('data', (d) => { stderr += d; });

      ps.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 0,
          executionTime: 0,
        });
      });

      ps.on('error', reject);
    });
  }
}

module.exports = CommandExecutor;
