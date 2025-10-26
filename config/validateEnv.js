// config/validateEnv.js - VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
const chalk = require('chalk'); // npm install chalk@4.1.2 (versão compatível com CommonJS)

/**
 * Valida se todas as variáveis de ambiente obrigatórias estão definidas
 */
const validateEnv = () => {
  console.log(chalk.blue('🔍 Validando variáveis de ambiente...\n'));

  // Variáveis obrigatórias
  const required = {
    'MONGO_URI': {
      description: 'URI de conexão do MongoDB',
      example: 'mongodb://localhost:27017/mdm',
      validator: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')
    },
    'JWT_SECRET': {
      description: 'Chave secreta para JWT',
      example: 'sua_chave_super_secreta_com_pelo_menos_32_caracteres',
      validator: (value) => value.length >= 32
    },
    'PORT': {
      description: 'Porta do servidor',
      example: '3000',
      validator: (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) < 65536
    }
  };

  // Variáveis opcionais (mas recomendadas)
  const optional = {
    'NODE_ENV': {
      description: 'Ambiente de execução',
      default: 'development',
      values: ['development', 'production', 'test']
    },
    'LOG_LEVEL': {
      description: 'Nível de log',
      default: 'info',
      values: ['error', 'warn', 'info', 'http', 'debug']
    },
    'AUTH_TOKEN': {
      description: 'Token de autenticação alternativo',
      default: 'nenhum'
    }
  };

  const errors = [];
  const warnings = [];

  // ===== VALIDAÇÃO DE VARIÁVEIS OBRIGATÓRIAS =====
  console.log(chalk.bold('Variáveis Obrigatórias:'));
  
  Object.entries(required).forEach(([key, config]) => {
    const value = process.env[key];
    
    if (!value) {
      errors.push({
        key,
        message: `❌ ${key} não encontrada`,
        help: `   💡 ${config.description}`,
        example: `   📝 Exemplo: ${key}=${config.example}`
      });
    } else if (config.validator && !config.validator(value)) {
      errors.push({
        key,
        message: `❌ ${key} tem valor inválido`,
        help: `   💡 ${config.description}`,
        example: `   📝 Exemplo: ${key}=${config.example}`
      });
    } else {
      // Mascara valores sensíveis
      const displayValue = key.includes('SECRET') || key.includes('PASSWORD') 
        ? '***' + value.slice(-4)
        : value.length > 50 
          ? value.slice(0, 47) + '...'
          : value;
      
      console.log(chalk.green(`   ✅ ${key}: ${displayValue}`));
    }
  });

  // ===== VALIDAÇÃO DE VARIÁVEIS OPCIONAIS =====
  console.log(chalk.bold('\nVariáveis Opcionais:'));
  
  Object.entries(optional).forEach(([key, config]) => {
    const value = process.env[key];
    
    if (!value) {
      console.log(chalk.yellow(`   ⚠️  ${key}: usando padrão (${config.default})`));
      warnings.push({
        key,
        message: `${key} não definida, usando valor padrão: ${config.default}`,
        help: config.description
      });
    } else if (config.values && !config.values.includes(value)) {
      console.log(chalk.yellow(`   ⚠️  ${key}: ${value} (valor não recomendado)`));
      warnings.push({
        key,
        message: `${key} tem valor não padrão: ${value}`,
        help: `Valores recomendados: ${config.values.join(', ')}`
      });
    } else {
      console.log(chalk.green(`   ✅ ${key}: ${value}`));
    }
  });

  // ===== VALIDAÇÕES ESPECÍFICAS =====
  
  // Validação de JWT_SECRET em produção
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      warnings.push({
        key: 'JWT_SECRET',
        message: 'JWT_SECRET muito curto para produção',
        help: 'Recomenda-se pelo menos 64 caracteres em ambiente de produção'
      });
    }
  }

  // Validação de MONGO_URI
  if (process.env.MONGO_URI) {
    if (process.env.MONGO_URI.includes('localhost') && process.env.NODE_ENV === 'production') {
      warnings.push({
        key: 'MONGO_URI',
        message: 'MongoDB usando localhost em produção',
        help: 'Considere usar um MongoDB remoto ou cluster'
      });
    }
  }

  // ===== EXIBIÇÃO DE ERROS E AVISOS =====
  console.log('\n' + '='.repeat(60));

  if (errors.length > 0) {
    console.log(chalk.red.bold('\n❌ ERROS ENCONTRADOS:\n'));
    
    errors.forEach(error => {
      console.log(chalk.red(error.message));
      console.log(chalk.gray(error.help));
      console.log(chalk.gray(error.example));
      console.log('');
    });

    console.log(chalk.yellow('💡 Dica: Crie um arquivo .env na raiz do projeto com estas variáveis.\n'));
    console.log(chalk.gray('Exemplo de .env:'));
    console.log(chalk.gray('─'.repeat(60)));
    Object.entries(required).forEach(([key, config]) => {
      console.log(chalk.gray(`${key}=${config.example}`));
    });
    console.log(chalk.gray('─'.repeat(60)));
    console.log('');

    throw new Error(`${errors.length} variável(is) de ambiente obrigatória(s) não encontrada(s) ou inválida(s)`);
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  AVISOS:\n'));
    
    warnings.forEach(warning => {
      console.log(chalk.yellow(`   • ${warning.message}`));
      if (warning.help) {
        console.log(chalk.gray(`     ${warning.help}`));
      }
    });
    console.log('');
  }

  console.log(chalk.green.bold('✅ Validação de ambiente concluída com sucesso!\n'));
  console.log('='.repeat(60) + '\n');
};

module.exports = validateEnv;