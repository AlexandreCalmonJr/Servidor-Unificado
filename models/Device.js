const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  device_name: { type: String, required: true, trim: false },
  device_model: { type: String, trim: false, default: 'N/A' },
  device_id: { type: String, required: true, trim: false },
  serial_number: { type: String, unique: true, trim: false, sparse: true, default: 'N/A' },
  imei: { type: String, unique: true, trim: false, sparse: true, default: 'N/A' },
  battery: { type: Number, min: 0, max: 100, default: null },
  network: { type: String, trim: false, default: 'N/A' },
  host: { type: String, trim: false, default: 'N/A' },
  sector: { type: String, trim: false, default: 'Desconhecido' },
  floor: { type: String, trim: false, default: 'Desconhecido' },
  mac_address_radio: { type: String, trim: false, default: 'N/A' },
  last_sync: { type: Date, default: Date.now },
  secure_android_id: { type: String, trim: false, default: 'N/A' },
  ip_address: { type: String, trim: false, default: 'N/A' },
  wifi_ipv6: { type: String, trim: false, default: 'N/A' },
  wifi_gateway_ip: { type: String, trim: false, default: 'N/A' },
  wifi_broadcast: { type: String, trim: false, default: 'N/A' },
  wifi_submask: { type: String, trim: false, default: 'N/A' },
  last_seen: { type: Date, default: Date.now },
  maintenance_status: { type: Boolean, default: false },
  maintenance_ticket: { type: String, default: '' },
  maintenance_reason: { type: String, default: '' },
  maintenance_history: [{
    timestamp: { type: Date, required: true },
    status: { type: String, required: true },
    ticket: { type: String }
  }],
  unit: { type: String, trim: false, default: 'N/A' },
  provisioning_status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  provisioning_token: { type: String },
  enrollment_date: { type: Date, default: Date.now },
  configuration_profile: { type: String },
  owner_organization: { type: String },
  compliance_status: {
    type: String,
    enum: ['compliant', 'non_compliant', 'unknown'],
    default: 'unknown'
  },
  installed_apps: [{
    package_name: String,
    version: String,
    install_date: Date
  }],
  security_policies: {
    password_required: { type: Boolean, default: false },
    encryption_enabled: { type: Boolean, default: false },
    screen_lock_timeout: { type: Number, default: 0 },
    allow_unknown_sources: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'Sem Monitorar'],
    default: 'offline'
  },
  is_online: { type: Boolean, default: false }
});

DeviceSchema.pre('validate', function (next) {
  if (!this.imei && !this.serial_number) {
    return next(new Error('Pelo menos um dos campos imei ou serial_number deve ser fornecido'));
  }
  next();
});

DeviceSchema.index({ serial_number: 1 }, { unique: true, sparse: true });
DeviceSchema.index({ bssid: 1 });

const Device = mongoose.model('Device', DeviceSchema);

module.exports = Device;