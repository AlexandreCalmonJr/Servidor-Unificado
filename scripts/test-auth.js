// File: test-auth.js - SCRIPT PARA TESTAR AUTENTICAÇÃO
// Execute: node test-auth.js

const http = require('http');

// CONFIGURAÇÕES (ajuste conforme necessário)
const SERVER = 'localhost';
const PORT = 3000;
const AUTH_TOKEN = 'hap@2025'; // Token do seu .env

// Função auxiliar para fazer requisições
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Testes
async function runTests() {
  console.log('🧪 TESTANDO AUTENTICAÇÃO DO SERVIDOR MDM\n');
  console.log('=' .repeat(60));
  
  // Teste 1: Listar módulos com AUTH_TOKEN
  console.log('\n📋 Teste 1: GET /api/modules com AUTH_TOKEN');
  console.log('-'.repeat(60));
  
  try {
    const result1 = await makeRequest({
      hostname: SERVER,
      port: PORT,
      path: '/api/modules',
      method: 'GET',
      headers: {
        'AUTH_TOKEN': AUTH_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${result1.statusCode}`);
    
    if (result1.statusCode === 200) {
      console.log('✅ SUCESSO - AUTH_TOKEN funcionou!');
      const data = JSON.parse(result1.body);
      console.log(`   Módulos encontrados: ${data.modules?.length || 0}`);
      
      if (data.modules && data.modules.length > 0) {
        console.log(`   Primeiro módulo: ${data.modules[0].name} (${data.modules[0].type})`);
        
        // Teste 2: Buscar detalhes do primeiro módulo
        console.log('\n📋 Teste 2: GET /api/modules/:id com AUTH_TOKEN');
        console.log('-'.repeat(60));
        
        const moduleId = data.modules[0]._id;
        const result2 = await makeRequest({
          hostname: SERVER,
          port: PORT,
          path: `/api/modules/${moduleId}`,
          method: 'GET',
          headers: {
            'AUTH_TOKEN': AUTH_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Status: ${result2.statusCode}`);
        
        if (result2.statusCode === 200) {
          console.log('✅ SUCESSO - Detalhes do módulo obtidos!');
          const moduleData = JSON.parse(result2.body);
          console.log(`   Nome: ${moduleData.module?.name}`);
          console.log(`   Tipo: ${moduleData.module?.type}`);
          console.log(`   Ativos: ${moduleData.module?.asset_count || 0}`);
        } else {
          console.log('❌ FALHA - Detalhes do módulo');
          console.log(`   Resposta: ${result2.body}`);
        }
      }
    } else {
      console.log('❌ FALHA - AUTH_TOKEN não funcionou');
      console.log(`   Resposta: ${result1.body}`);
    }
  } catch (error) {
    console.log('❌ ERRO na requisição:');
    console.log(`   ${error.message}`);
  }
  
  // Teste 3: Tentar com token inválido
  console.log('\n📋 Teste 3: GET /api/modules com token INVÁLIDO');
  console.log('-'.repeat(60));
  
  try {
    const result3 = await makeRequest({
      hostname: SERVER,
      port: PORT,
      path: '/api/modules',
      method: 'GET',
      headers: {
        'AUTH_TOKEN': 'token_invalido_123',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${result3.statusCode}`);
    
    if (result3.statusCode === 401) {
      console.log('✅ CORRETO - Token inválido foi rejeitado');
    } else {
      console.log('⚠️  ATENÇÃO - Token inválido não foi rejeitado corretamente');
    }
  } catch (error) {
    console.log('❌ ERRO na requisição:');
    console.log(`   ${error.message}`);
  }
  
  // Teste 4: Sem token
  console.log('\n📋 Teste 4: GET /api/modules SEM token');
  console.log('-'.repeat(60));
  
  try {
    const result4 = await makeRequest({
      hostname: SERVER,
      port: PORT,
      path: '/api/modules',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${result4.statusCode}`);
    
    if (result4.statusCode === 401) {
      console.log('✅ CORRETO - Requisição sem token foi rejeitada');
    } else {
      console.log('⚠️  ATENÇÃO - Requisição sem token não foi rejeitada');
    }
  } catch (error) {
    console.log('❌ ERRO na requisição:');
    console.log(`   ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTES CONCLUÍDOS\n');
}

// Executar testes
runTests().catch(error => {
  console.error('\n❌ ERRO FATAL:', error);
  process.exit(1);
});