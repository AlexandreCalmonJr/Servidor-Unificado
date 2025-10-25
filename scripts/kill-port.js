// scripts/kill-port.js
// Script para encerrar processos rodando em uma porta específica

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = process.env.PORT || 3000;

async function killPort(port) {
  console.log(`🔍 Procurando processos na porta ${port}...`);
  
  try {
    // Comando para Windows
    if (process.platform === 'win32') {
      // Encontrar PID da porta
      const { stdout: findOutput } = await execPromise(`netstat -ano | findstr :${port}`);
      
      if (!findOutput.trim()) {
        console.log(`✅ Nenhum processo encontrado na porta ${port}`);
        return;
      }

      console.log('📋 Processos encontrados:');
      console.log(findOutput);

      // Extrair PIDs
      const lines = findOutput.split('\n').filter(line => line.trim());
      const pids = new Set();

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      });

      if (pids.size === 0) {
        console.log(`⚠️  Nenhum PID válido encontrado`);
        return;
      }

      // Encerrar cada processo
      for (const pid of pids) {
        try {
          await execPromise(`taskkill /F /PID ${pid}`);
          console.log(`✅ Processo ${pid} encerrado com sucesso`);
        } catch (err) {
          console.error(`❌ Erro ao encerrar processo ${pid}:`, err.message);
        }
      }

      console.log(`\n✨ Porta ${port} liberada!`);
    } 
    // Comando para Linux/Mac
    else {
      const { stdout } = await execPromise(`lsof -ti:${port}`);
      
      if (!stdout.trim()) {
        console.log(`✅ Nenhum processo encontrado na porta ${port}`);
        return;
      }

      const pids = stdout.trim().split('\n');
      
      for (const pid of pids) {
        try {
          await execPromise(`kill -9 ${pid}`);
          console.log(`✅ Processo ${pid} encerrado com sucesso`);
        } catch (err) {
          console.error(`❌ Erro ao encerrar processo ${pid}:`, err.message);
        }
      }

      console.log(`\n✨ Porta ${port} liberada!`);
    }
  } catch (error) {
    if (error.message.includes('command not found') || error.message.includes('não reconhecido')) {
      console.error('❌ Comando não encontrado. Execute manualmente:');
      if (process.platform === 'win32') {
        console.log(`   netstat -ano | findstr :${port}`);
        console.log(`   taskkill /F /PID <PID>`);
      } else {
        console.log(`   lsof -ti:${port}`);
        console.log(`   kill -9 <PID>`);
      }
    } else if (!error.stdout || error.stdout.trim() === '') {
      console.log(`✅ Nenhum processo encontrado na porta ${port}`);
    } else {
      console.error('❌ Erro ao liberar porta:', error.message);
    }
  }
}

// Executar
killPort(PORT).then(() => {
  console.log('\n💡 Agora você pode iniciar o servidor com: node server.js');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});