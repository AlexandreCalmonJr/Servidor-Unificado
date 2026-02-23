const mongoose = require('mongoose');
require('dotenv').config();
const AssetModuleConfig = require('../models/AssetModuleConfig');

async function checkModules() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const modules = await AssetModuleConfig.find().lean();
    console.log('Módulos configurados no banco:\n');
    modules.forEach(m => {
      console.log(`  - Name: ${m.name}`);
      console.log(`    Type: ${m.type}`);
      console.log(`    ID: ${m._id}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

checkModules();
