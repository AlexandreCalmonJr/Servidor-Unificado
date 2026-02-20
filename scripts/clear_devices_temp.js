const mongoose = require('mongoose');
require('dotenv').config();

const clearDevices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mdm');
    console.log('Connected to DB');

    const collectionsToDrop = [
      'devices',
      'managedassets',
      'desktops',
      'totems',
      'notebooks',
      'printers',
      'panels',
      'locationhistories',
      'assetcommands',
      'commands'
    ];

    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    for (let name of collectionsToDrop) {
      if (collectionNames.includes(name)) {
        await mongoose.connection.db.dropCollection(name);
        console.log(`Dropped collection: ${name}`);
      } else {
        console.log(`Collection not found (already empty/doesn't exist): ${name}`);
      }
    }

    console.log('Finished clearing device data.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

clearDevices();
