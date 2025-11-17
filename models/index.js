// models/index.js
// Exporta todos os modelos para facilitar a importação

module.exports = {
  AssetModule: require('./AssetModule'),
  AssetModuleConfig: require('./AssetModuleConfig'),
  BssidMapping: require('./BssidMapping'),
  Command: require('./Command'),
  ConfigProfile: require('./ConfigProfile'),
  Desktop: require('./Desktop'),
  Device: require('./Device'),
  IpMapping: require('./IpMapping'),
  LocationHistory: require('./LocationHistory'),
  ManagedAsset: require('./ManagedAsset'),
  Notebook: require('./Notebook'),
  Panel: require('./Panel'),
  Printer: require('./Printer'),
  ProvisioningToken: require('./ProvisioningToken'),
  Totem: require('./Totem'),
  UnitMapping: require('./UnitMapping'),
  User: require('./User')
};
