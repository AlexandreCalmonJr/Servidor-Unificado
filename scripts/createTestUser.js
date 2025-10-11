const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mdm', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Conectado ao MongoDB');
    
    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ username: 'usuario_teste' });
    if (existingUser) {
      console.log('⚠️ Usuário de teste já existe: usuario_teste');
      process.exit(0);
    }
    
    const hashedPassword = await bcrypt.hash('user123', 10);
    
    const user = new User({
      username: 'usuario_teste',
      email: 'usuario@teste.com',
      password: hashedPassword,
      role: 'user',
      sector: 'TI'
    });
    
    await user.save();
    console.log('✅ Usuário comum criado com sucesso!');
    console.log('Username: usuario_teste');
    console.log('Password: user123');
    console.log('Role: user');
    console.log('Sector: TI');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

createTestUser();

