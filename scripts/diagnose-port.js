// scripts/diagnose-port.js
// Diagnóstico completo de portas e processos

const { exec } = require('child_process');
const util = require('util');
const net = require('net');
const execPromise = util.promisify(exec);

const PORT = process.env.PORT || 3000;

async function testPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, error: err });
      } else {
        resolve({ available: false, error: err });
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve({ available: true });
    });
    
    server.listen(port, '0.0.0.0');
  });
}

async function findProcessOnPort(port) {
  console.log(`\n🔍 Procurando processos na porta ${port}...\n`);
  
  try {
    if (process.platform === 'win32') {
      // Windows: usar netstat
      const { stdout } = await execPromise(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8'
      });
      
      console.log('📋 Resultado do netstat:');
      console.log(stdout || '(vazio)');
      console.log('---\n');
      
      if (stdout && stdout.trim()) {
        const lines = stdout.split('\n').filter(line => line.trim());
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && !isNaN(pid)) {
            pids.add(pid);
          }
        });
        
        console.log(`📌 PIDs encontrados: ${Array.from(pids).join(', ')}\n`);
        
        // Buscar detalhes de cada PID
        for (const pid of pids) {
          try {
            const { stdout: taskInfo } = await execPromise(`tasklist /FI "PID eq ${pid}" /FO LIST`);
            console.log(`ℹ️  Informações do processo ${pid}:`);
            console.log(taskInfo);
            console.log('---\n');
          } catch (err) {
            console.log(`⚠️  Não foi possível obter informações do PID ${pid}\n`);
          }
        }
        
        return Array.from(pids);
      }
    } else {
      // Linux/Mac: usar lsof
      const { stdout } = await execPromise(`lsof -i :${port}`);
      console.log('📋 Resultado do lsof:');
      console.log(stdout);
      return stdout.split('\n').slice(1).filter(l => l.trim()).map(l => l.split(/\s+/)[1]);
    }
  } catch (error) {
    if (!error.stdout || error.stdout.trim() === '') {
      console.log('✅ Nenhum processo encontrado via netstat/lsof\n');
      return [];
    }
    console.log('⚠️  Erro ao buscar processos:', error.message, '\n');
    return [];
  }
  
  return [];
}

async function killProcesses(pids) {
  if (pids.length === 0) {
    console.log('ℹ️  Nenhum processo para encerrar\n');
    return;
  }
  
  console.log(`🔨 Tentando encerrar ${pids.length} processo(s)...\n`);
  
  for (const pid of pids) {
    try {
      if (process.platform === 'win32') {
        await execPromise(`taskkill /F /PID ${pid}`);
      } else {
        await execPromise(`kill -9 ${pid}`);
      }
      console.log(`✅ Processo ${pid} encerrado com sucesso`);
    } catch (err) {
      console.error(`❌ Falha ao encerrar processo ${pid}:`, err.message);
    }
  }
  
  console.log('');
}

async function findAllNodeProcesses() {
  console.log('🔍 Procurando TODOS os processos Node.js...\n');
  
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execPromise('tasklist | findstr node.exe');
      console.log('📋 Processos Node.js encontrados:');
      console.log(stdout || '(nenhum)');
      console.log('');
    } else {
      const { stdout } = await execPromise('ps aux | grep node');
      console.log('📋 Processos Node.js encontrados:');
      console.log(stdout);
    }
  } catch (err) {
    console.log('ℹ️  Nenhum processo Node.js encontrado\n');
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  DIAGNÓSTICO DE PORTA                  ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // Teste 1: Verificar se a porta está disponível
  console.log(`📍 Testando disponibilidade da porta ${PORT}...\n`);
  const portTest = await testPort(PORT);
  
  if (portTest.available) {
    console.log(`✅ Porta ${PORT} está LIVRE!\n`);
    console.log('💡 O servidor deve iniciar normalmente agora.');
    console.log('💡 Execute: node server.js\n');
    return;
  } else {
    console.log(`❌ Porta ${PORT} está EM USO\n`);
    console.log(`   Erro: ${portTest.error.code}\n`);
  }
  
  // Teste 2: Buscar processos na porta
  const pids = await findProcessOnPort(PORT);
  
  // Teste 3: Listar todos os processos Node.js
  await findAllNodeProcesses();
  
  // Teste 4: Oferecer encerrar processos
  if (pids.length > 0) {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  AÇÕES DISPONÍVEIS                     ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('Encontrei processo(s) na porta. Você pode:');
    console.log(`1. Encerrar automaticamente (node scripts/kill-port.js)`);
    console.log(`2. Encerrar manualmente com:`);
    
    if (process.platform === 'win32') {
      pids.forEach(pid => {
        console.log(`   taskkill /F /PID ${pid}`);
      });
    } else {
      pids.forEach(pid => {
        console.log(`   kill -9 ${pid}`);
      });
    }
    
    console.log(`3. Usar outra porta: PORT=3001 node server.js\n`);
  } else {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  SITUAÇÃO ANÔMALA                      ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('⚠️  A porta está em uso mas não encontrei o processo!\n');
    console.log('Possíveis causas:');
    console.log('1. Firewall ou antivírus bloqueando');
    console.log('2. Outro serviço do Windows usando a porta');
    console.log('3. Processo travado invisível\n');
    console.log('Soluções:');
    console.log('1. Reiniciar o computador');
    console.log('2. Usar outra porta: PORT=3001 node server.js');
    console.log('3. Executar como Administrador\n');
  }
}

main().catch(err => {
  console.error('❌ Erro no diagnóstico:', err);
  process.exit(1);
});