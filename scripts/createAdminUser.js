const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../backend/models/User');
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

        // Senha inicial vem do ambiente; se ausente, gera aleatória e mostra uma única vez.
        const generated = !process.env.ADMIN_PASSWORD;
        const initialPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');

        const adminUser = new User({
            username: 'admin',
            email: 'admin@mdm.local',
            password: initialPassword,
            role: 'admin',
            sector: 'Global'
        });

        await adminUser.save();

        console.log('✅ Usuário administrador criado com sucesso!');
        console.log('Username: admin');
        if (generated) {
            console.log(`Senha inicial gerada (guarde e troque no primeiro acesso): ${initialPassword}`);
        } else {
            console.log('Senha inicial definida por ADMIN_PASSWORD (não exibida).');
        }

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

