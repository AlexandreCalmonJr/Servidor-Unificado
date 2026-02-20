// models/index.js
// Exporta todos os modelos para facilitar a importação

module.exports = {
  AssetModule: require('./AssetModule'),
  AssetModuleConfig: require('./AssetModuleConfig'),
  AssetCommand: require('./AssetCommand'),  // ✅ FIX: Usar apenas AssetCommand
  BssidMapping: require('./BssidMapping'),
  // Command: require('./Command'),  // ✅ REMOVIDO - Usar AssetCommand ao invés
  ConfigProfile: require('./ConfigProfile'),
  // Desktop: require('./Desktop'),  // ✅ REMOVIDO - Usar ManagedAsset
  Device: require('./Device'),
  IpMapping: require('./IpMapping'),
  LocationHistory: require('./LocationHistory'),
  ManagedAsset: require('./ManagedAsset'),  // ✅ Consolidado - Desktop/Notebook/Panel/Printer
  // Notebook: require('./Notebook'),  // ✅ REMOVIDO - Usar ManagedAsset
  // Panel: require('./Panel'),  // ✅ REMOVIDO - Usar ManagedAsset
  // Printer: require('./Printer'),  // ✅ REMOVIDO - Usar ManagedAsset
  ProvisioningToken: require('./ProvisioningToken'),
  // Totem: require('./Totem'),  // ✅ REMOVIDO - Consolidado em ManagedAsset com asset_type='totem'
  UnitMapping: require('./UnitMapping'),
  User: require('./User')
};