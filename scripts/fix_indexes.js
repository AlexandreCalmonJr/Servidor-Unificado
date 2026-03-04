// scripts/fix_indexes.js
require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
    console.log('➜ Conectando ao MongoDB...');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Conectado.');

        const db = mongoose.connection.db;
        const coll = db.collection('managedassets');

        // Lista todos os índices para diagnóstico
        const indexes = await coll.indexes();
        console.log('\n➜ Índices existentes:', indexes.map(i => i.name).join(', '));

        const toRemove = [
            'serial_number_1',             // índice único global de serial
            'serial_number_unique',         // alias antigo
            'asset_type_1_serial_number_1', // CAUSA DO 409: composto por asset_type + serial
        ];

        console.log('\n➜ Removendo índices legados...');
        for (const indexName of toRemove) {
            try {
                await coll.dropIndex(indexName);
                console.log(`✓ Índice "${indexName}" removido.`);
            } catch (e) {
                console.log(`- Índice "${indexName}" não encontrado ou já removido.`);
            }
        }

        // Lista índices após a remoção
        const remaining = await coll.indexes();
        console.log('\n➜ Índices restantes:', remaining.map(i => i.name).join(', '));

        console.log('\n★ Correção finalizada! O Erro 409 no Desktop está resolvido.');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

fixIndexes();
