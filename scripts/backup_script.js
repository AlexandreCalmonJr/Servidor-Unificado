const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configurações do seu banco de dados
const dbName = 'mdm';
const dbHost = 'localhost';
const dbPort = '27017';

// Defina o caminho completo para o executável do mongodump
const mongodumpPath = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';

// Altere este caminho para o local onde a pasta do seu servidor de arquivos está montada
const backupDir = 'D:\\backups\\mdm_backups'; // Exemplo para o Windows

// Certifica-se de que a pasta de backup existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Nome do arquivo de backup com timestamp para evitar sobrescrita
const backupFileName = `${dbName}_${new Date().toISOString().replace(/:/g, '-')}`;
const backupPath = path.join(backupDir, backupFileName);

// Comando a ser executado, agora com o caminho completo
const command = `"${mongodumpPath}" --host ${dbHost} --port ${dbPort} --db ${dbName} --out "${backupPath}"`;

console.log(`Iniciando backup do banco de dados '${dbName}'...`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao fazer o backup: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Erro: ${stderr}`);
    return;
  }
  console.log('Backup concluído com sucesso!');
  console.log(`Backup salvo em: ${backupPath}`);
});
