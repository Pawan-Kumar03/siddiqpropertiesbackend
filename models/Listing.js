const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  propertyType: { type: String, required: true },
  beds: { type: Number, required: true },
  extension: { type: String, required: true },
 
});

module.exports = mongoose.model('Listing', ListingSchema);
