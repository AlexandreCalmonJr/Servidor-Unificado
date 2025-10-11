const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Por favor, use um email válido']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // NOVO CAMPO: Setor ao qual o usuário pertence
    sector: {
        type: String,
        required: function() { return this.role === 'user'; }, // Obrigatório para usuários comuns
        default: 'Global', // Valor padrão para admin ou se não especificado
        trim: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Pré-salvar a senha criptografada
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar a senha
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
