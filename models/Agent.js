// models/Agent.js
import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
    agentName: { type: String, required: true },
    agentEmail: { type: String, required: true },
    contactNumber: { type: String, required: true },
    contactWhatsApp: { type: String, required: true },
    profilePhoto: { type: String }, // Store the URL of the uploaded image
});

const Agent = mongoose.model('Agent', agentSchema);
export default Agent;
