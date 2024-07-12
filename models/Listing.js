import mongoose from 'mongoose';

// Define a model for listings
const ListingSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  propertyType: { type: String, required: true },
  beds: { type: Number, required: true },
  extension: { type: String, required: true },
  broker: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  whatsapp: { type: String, required: true }
}, { collection: 'listings' });

const Listing = mongoose.model('Listing', ListingSchema);

export default Listing;
