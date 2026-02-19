const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async (isStandalone = false) => {
    try {
        if (isStandalone) {
            // Conectar ao banco de dados apenas se for standalone
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mdm', {
                serverSelectionTimeoutMS: 5000,
                family: 4,
            });
            console.log('Conectado ao MongoDB');
        }

        // Verificar se já existe um usuário admin
        const existingAdmin = await User.findOne({ role: 'admin' });

        if (existingAdmin) {
            console.log('ℹ️ Usuário administrador já existe:', existingAdmin.username);
            return;
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
        if (isStandalone) {
            await mongoose.connection.close();
            process.exit(0);
        }
    }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
    createAdminUser(true);
}

module.exports = createAdminUser;

