const chalk = require('chalk');

const WEAK_VALUES = new Set([
  'fallback_secret',
  'hap@2025',
  'admin123',
  'sua_chave_super_secreta_com_pelo_menos_32_caracteres_aqui',
]);

const looksStrongSecret = (value, minLength = 32) => {
  if (!value || value.length < minLength) return false;
  if (WEAK_VALUES.has(value)) return false;
  return true;
};

const validateEnv = () => {
  console.log(chalk.blue('Validando variaveis de ambiente...\n'));

  const required = {
    MONGO_URI: {
      description: 'URI de conexao do MongoDB',
      example: 'mongodb://localhost:27017/mdm',
      validator: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
    },
    JWT_SECRET: {
      description: 'Chave secreta forte para JWT',
      example: 'gere com: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
      validator: (value) => looksStrongSecret(value, 64),
    },
    AUTH_TOKEN: {
      description: 'Token forte para autenticacao de dispositivos/agentes',
      example: 'gere com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
      validator: (value) => looksStrongSecret(value, 48),
    },
    PORT: {
      description: 'Porta do servidor',
      example: '3000',
      validator: (value) => !Number.isNaN(value) && Number(value) > 0 && Number(value) < 65536,
    },
  };

  const optional = {
    NODE_ENV: {
      description: 'Ambiente de execucao',
      default: 'development',
      values: ['development', 'production', 'test'],
    },
    LOG_LEVEL: {
      description: 'Nivel de log',
      default: 'info',
      values: ['error', 'warn', 'info', 'http', 'debug'],
    },
    JWT_EXPIRES_IN: {
      description: 'Duracao do JWT',
      default: '2h',
    },
    CORS_ORIGIN: {
      description: 'Origens CORS permitidas, separadas por virgula',
      default: 'somente same-origin/desenvolvimento',
    },
    COMMAND_SIGNING_PRIVATE_KEY: {
      description: 'Chave privada PEM para assinar comandos remotos (ou COMMAND_SIGNING_PRIVATE_KEY_FILE)',
      default: 'nao configurada',
      resolved: () => {
        try {
          const secrets = require('./secrets');
          return Boolean(process.env.COMMAND_SIGNING_PRIVATE_KEY || process.env.COMMAND_SIGNING_PRIVATE_KEY_FILE || secrets.COMMAND_PRIVATE_KEY);
        } catch {
          return Boolean(process.env.COMMAND_SIGNING_PRIVATE_KEY || process.env.COMMAND_SIGNING_PRIVATE_KEY_FILE);
        }
      },
    },
  };

  const errors = [];
  const warnings = [];

  console.log(chalk.bold('Variaveis Obrigatorias:'));

  Object.entries(required).forEach(([key, config]) => {
    const value = process.env[key];

    if (!value) {
      errors.push({
        key,
        message: `${key} nao encontrada`,
        help: config.description,
        example: `Exemplo: ${key}=${config.example}`,
      });
    } else if (config.validator && !config.validator(value)) {
      errors.push({
        key,
        message: `${key} tem valor inseguro ou invalido`,
        help: config.description,
        example: `Exemplo: ${key}=${config.example}`,
      });
    } else {
      const displayValue = key.includes('SECRET') || key.includes('TOKEN')
        ? `***${value.slice(-4)}`
        : value.length > 50 ? `${value.slice(0, 47)}...` : value;
      console.log(chalk.green(`   OK ${key}: ${displayValue}`));
    }
  });

  console.log(chalk.bold('\nVariaveis Opcionais:'));

  Object.entries(optional).forEach(([key, config]) => {
    const isResolved = typeof config.resolved === 'function' ? config.resolved() : Boolean(process.env[key]);
    const value = process.env[key];

    if (!value && !isResolved) {
      console.log(chalk.yellow(`   AVISO ${key}: usando padrao (${config.default})`));
      warnings.push({ key, message: `${key} nao definida`, help: config.description });
    } else if (value && config.values && !config.values.includes(value)) {
      console.log(chalk.yellow(`   AVISO ${key}: ${value} (valor nao recomendado)`));
      warnings.push({ key, message: `${key} tem valor nao padrao`, help: `Valores recomendados: ${config.values.join(', ')}` });
    } else {
      const displayValue = isResolved && !value ? '(configurada via arquivo/secret)' : (key.includes('KEY') ? `***${value.slice(-12)}` : value);
      console.log(chalk.green(`   OK ${key}: ${displayValue}`));
    }
  });

  if (process.env.NODE_ENV === 'production') {
    if (process.env.CORS_ORIGIN === '*') {
      errors.push({
        key: 'CORS_ORIGIN',
        message: 'CORS_ORIGIN=* nao e permitido em producao',
        help: 'Configure uma lista explicita de origens HTTPS confiaveis.',
        example: 'CORS_ORIGIN=https://mdm.exemplo.com',
      });
    }

    if (process.env.MONGO_URI?.includes('localhost')) {
      warnings.push({
        key: 'MONGO_URI',
        message: 'MongoDB usando localhost em producao',
        help: 'Considere usar um MongoDB remoto ou cluster.',
      });
    }
  }

  const hasSigningKey = typeof optional.COMMAND_SIGNING_PRIVATE_KEY.resolved === 'function'
    ? optional.COMMAND_SIGNING_PRIVATE_KEY.resolved()
    : Boolean(process.env.COMMAND_SIGNING_PRIVATE_KEY);

  if (!hasSigningKey) {
    warnings.push({
      key: 'COMMAND_SIGNING_PRIVATE_KEY',
      message: 'Comandos remotos nao serao assinados sem COMMAND_SIGNING_PRIVATE_KEY',
      help: 'Configure par RSA privada no servidor e publica nos agentes desktop para comandos customizados.',
    });
  }

  console.log('\n' + '='.repeat(60));

  if (errors.length > 0) {
    console.log(chalk.red.bold('\nERROS ENCONTRADOS:\n'));
    errors.forEach((error) => {
      console.log(chalk.red(`   ${error.message}`));
      console.log(chalk.gray(`   ${error.help}`));
      console.log(chalk.gray(`   ${error.example}`));
      console.log('');
    });
    throw new Error(`${errors.length} variavel(is) de ambiente obrigatoria(s) ausente(s), insegura(s) ou invalida(s)`);
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('\nAVISOS:\n'));
    warnings.forEach((warning) => {
      console.log(chalk.yellow(`   - ${warning.message}`));
      if (warning.help) console.log(chalk.gray(`     ${warning.help}`));
    });
    console.log('');
  }

  console.log(chalk.green.bold('Validacao de ambiente concluida com sucesso!\n'));
  console.log('='.repeat(60) + '\n');
};

module.exports = validateEnv;
