// File: verify-config.js
// Executa: node verify-config.js
// Verifica se a configuração do servidor está correta

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICADOR DE CONFIGURAÇÃO DO SERVIDOR MDM\n');
console.log('='.repeat(70));

let errors = 0;
let warnings = 0;
let success = 0;

// Função helper para verificar conteúdo de arquivo
function checkFile(filePath, checks) {
  console.log(`\n📄 Verificando: ${filePath}`);
  console.log('-'.repeat(70));
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ERRO: Arquivo não encontrado`);
    errors++;
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  checks.forEach(check => {
    if (check.type === 'contains') {
      if (content.includes(check.text)) {
        console.log(`✅ ${check.name}`);
        success++;
      } else {
        console.log(`❌ ERRO: ${check.name}`);
        console.log(`   Esperado: "${check.text}"`);
        errors++;
      }
    } else if (check.type === 'regex') {
      if (check.pattern.test(content)) {
        console.log(`✅ ${check.name}`);
        success++;
      } else {
        console.log(`❌ ERRO: ${check.name}`);
        console.log(`   Padrão esperado: ${check.pattern}`);
        errors++;
      }
    } else if (check.type === 'not-contains') {
      if (!content.includes(check.text)) {
        console.log(`✅ ${check.name}`);
        success++;
      } else {
        console.log(`⚠️  AVISO: ${check.name}`);
        warnings++;
      }
    }
  });
  
  return true;
}

// ===== VERIFICAÇÕES =====

// 1. Verificar server.js
checkFile('server.js', [
  {
    type: 'contains',
    text: "require('./middleware/deviceAuth')",
    name: 'deviceAuth importado'
  },
  {
    type: 'regex',
    pattern: /moduleRoutes\([^)]*deviceAuth[^)]*\)/,
    name: 'deviceAuth passado para moduleRoutes (5º parâmetro)'
  },
  {
    type: 'contains',
    text: "'/api/modules'",
    name: 'Rota /api/modules configurada'
  }
]);

// 2. Verificar routes/moduleRoutes.js
checkFile('routes/moduleRoutes.js', [
  {
    type: 'contains',
    text: 'module.exports = (logger, getApiLimiter, modifyApiLimiter, auth, deviceAuth)',
    name: 'Função exporta com 5 parâmetros (incluindo deviceAuth)'
  },
  {
    type: 'contains',
    text: 'const flexibleAuth',
    name: 'Função flexibleAuth existe'
  },
  {
    type: 'contains',
    text: 'auth(req, res, (err)',
    name: 'flexibleAuth tenta JWT primeiro'
  },
  {
    type: 'contains',
    text: 'deviceAuth(req, res, (err2)',
    name: 'flexibleAuth faz fallback para deviceAuth'
  },
  {
    type: 'regex',
    pattern: /router\.get\(['"]\/['"],\s*flexibleAuth/,
    name: 'GET /api/modules usa flexibleAuth'
  },
  {
    type: 'regex',
    pattern: /router\.get\(['"]\/\:moduleId['"],\s*flexibleAuth/,
    name: 'GET /api/modules/:id usa flexibleAuth'
  },
  {
    type: 'regex',
    pattern: /router\.post\(['"]\/\:moduleId\/assets['"],\s*flexibleAuth/,
    name: 'POST /api/modules/:id/assets usa flexibleAuth'
  }
]);

// 3. Verificar middleware/deviceAuth.js
checkFile('middleware/deviceAuth.js', [
  {
    type: 'contains',
    text: 'process.env.AUTH_TOKEN',
    name: 'Usa AUTH_TOKEN do .env'
  },
  {
    type: 'contains',
    text: "req.headers['auth_token']",
    name: 'Verifica header AUTH_TOKEN'
  },
  {
    type: 'contains',
    text: 'req.device',
    name: 'Popula req.device ao autenticar'
  }
]);

// 4. Verificar .env
checkFile('.env', [
  {
    type: 'regex',
    pattern: /AUTH_TOKEN\s*=\s*.+/,
    name: 'AUTH_TOKEN definido'
  },
  {
    type: 'regex',
    pattern: /JWT_SECRET\s*=\s*.+/,
    name: 'JWT_SECRET definido'
  },
  {
    type: 'regex',
    pattern: /MONGO_URI\s*=\s*.+/,
    name: 'MONGO_URI definido'
  }
]);

// 5. Verificar middleware/auth.js
checkFile('middleware/auth.js', [
  {
    type: 'contains',
    text: "req.headers['auth_token']",
    name: 'Suporta AUTH_TOKEN header'
  },
  {
    type: 'contains',
    text: "req.headers.authorization?.startsWith('Bearer ')",
    name: 'Suporta Authorization Bearer'
  },
  {
    type: 'contains',
    text: 'jwt.verify',
    name: 'Valida JWT'
  }
]);

// ===== RESUMO =====
console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO DA VERIFICAÇÃO\n');

console.log(`✅ Verificações bem-sucedidas: ${success}`);
if (warnings > 0) {
  console.log(`⚠️  Avisos: ${warnings}`);
}
if (errors > 0) {
  console.log(`❌ Erros encontrados: ${errors}`);
}

console.log('\n' + '='.repeat(70));

if (errors === 0) {
  console.log('\n🎉 TUDO CERTO! A configuração está correta.');
  console.log('\nPróximos passos:');
  console.log('1. Reinicie o servidor: node server.js');
  console.log('2. Execute o teste: node test-auth.js');
  console.log('3. Teste o agente Flutter\n');
  process.exit(0);
} else {
  console.log('\n❌ PROBLEMAS ENCONTRADOS!');
  console.log('\nCorreções necessárias:');
  console.log('1. Revise os erros acima');
  console.log('2. Consulte o GUIA DE TROUBLESHOOTING');
  console.log('3. Substitua os arquivos pelos artefatos fornecidos');
  console.log('4. Execute este script novamente\n');
  process.exit(1);
}