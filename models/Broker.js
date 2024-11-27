import mongoose from 'mongoose';

const brokerSchema = new mongoose.Schema({
  reraBrokerID: { type: String, required: true },
  companyLicenseNumber: { type: String, required: true },
  companyTelephoneNumber: { type: String, required: true },
  reraIDCardUrl: { type: String, required: true }, // Store the link to the RERA ID Card
}, { timestamps: true });

const Broker = mongoose.model('Broker', brokerSchema);

export default Broker;
