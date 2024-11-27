const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  reraBrokerID: { type: String, required: true },
  companyLicenseNumber: { type: String, required: true },
  companyTelephoneNumber: { type: String, required: true },
  reraIDCardUrl: { type: String, required: true }, // Store the link to the RERA ID Card
}, { timestamps: true });

module.exports = mongoose.model('Broker', brokerSchema);
