import mongoose from 'mongoose';

const ListingSchema = new mongoose.Schema({
  image: { type: String, default: '' },  // For single image
  images: { type: [String], default: [] },  // For multiple images
  pdf: { type: String, default: '' },
  title: { type: String, required: true },
  price: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  country: { type: String, required: true }, // New field for country
  propertyType: { type: String, required: true },
  beds: { type: Number, required: true },
  baths: { type: Number, default: 0 },
  description: { type: String, default: '' },
  propertyReferenceId: { type: String, default: '' },
  building: { type: String, default: '' },
  neighborhood: { type: String, default: '' },
  developments: { type: String, default: '' }, // New field for developments
  landlordName: { type: String, default: '' },
  reraTitleNumber: { type: String, default: '' },
  reraPreRegistrationNumber: { type: String, default: '' },
  agentName: { type: String, default: '' },
  agentCallNumber: { type: String, default: '' },
  agentEmail: { type: String, default: '' },
  agentWhatsapp: { type: String, default: '' },
  extension: { type: String, required: true },
  broker: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  whatsapp: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { type: String, required: true },
  landlord: { type: Boolean, default: false }, // Field to determine if the listing is by landlord
  amenities: { type: [String], default: [],required: false }, // Field for amenities
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Reference to user
}, { collection: 'listings' });

const Listing = mongoose.model('Listing', ListingSchema);

export default Listing;
