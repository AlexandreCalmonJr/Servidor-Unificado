const mongoose = require('mongoose');

const CommandSchema = new mongoose.Schema({
  device_name: { type: String, required: true, trim: true },
  serial_number: { type: String, required: true, trim: true },
  command: { type: String, required: true, trim: true },
  parameters: { type: Object },
  status: { type: String, default: 'pending' },
  result: { type: String },
  createdAt: { type: Date, default: Date.now },
  executedAt: { type: Date }
});

CommandSchema.index({ serial_number: 1, status: 1 });

const Command = mongoose.model('Command', CommandSchema);

module.exports = Command;