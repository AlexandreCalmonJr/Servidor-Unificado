const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
    try {
        // Conectar ao banco de dados
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mdm', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Conectado ao MongoDB');

        // Verificar se já existe um usuário admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('Usuário administrador já existe:', existingAdmin.username);
            process.exit(0);
        }

        // Criar usuário administrador padrão
        const adminUser = new User({
            username: 'admin',
            email: 'admin@mdm.local',
            password: 'admin123', // Será criptografada automaticamente pelo modelo
            role: 'admin',
            sector: 'Global'
        });

        await adminUser.save();
        
        console.log('✅ Usuário administrador criado com sucesso!');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('⚠️  IMPORTANTE: Altere a senha padrão após o primeiro login!');
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário administrador:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
    createAdminUser();
}

module.exports = createAdminUser;

