import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import twilio from 'twilio';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true,  dbName: 'PropertySales'})
  .then(() => {
    console.log('Database connected successfully');
    // console.log('Database Name:', mongoose.connection.name);
    // console.log('Collections:', mongoose.connection.collections);

    // Start the server after successful database connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection error:', err));

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadDir));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

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
}, { collection: 'listings' }); // Explicitly define collection name

const Listing = mongoose.model('Listing', ListingSchema, 'listings'); // Use 'listings' collection explicitly

// Get all listings
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await Listing.find();
    // console.log('Listings from DB:', listings); // Log fetched listings
    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
});

// Get a specific listing by ID
app.get('/api/listings/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing ID' });
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    res.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ message: 'Failed to fetch listing' });
  }
});

// Post a new listing with file upload
app.post('/api/listings', upload.single('images'), async (req, res) => {
  const { title, price, city, location, propertyType, beds, extension, broker, phone, email, whatsapp } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : 'default_image_url';

  const listing = new Listing({
    title,
    price,
    city,
    location,
    propertyType,
    beds,
    extension,
    image: imageUrl,
    broker,
    phone,
    email,
    whatsapp
  });

  try {
    const savedListing = await listing.save();
    // console.log('Listing added:', savedListing);
    res.status(201).json(savedListing);
  } catch (error) {
    console.error('Failed to add listing:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a listing by ID with file upload
app.put('/api/listings/:id', upload.array('images', 12), async (req, res) => {
  const { id } = req.params;
  const { title, price, city, location, propertyType, beds, extension, broker, email, phone, whatsapp } = req.body;
  const images = req.files.map(file => `/uploads/${file.filename}`);

  try {
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { title, price, city, location, propertyType, beds, extension, images, broker, email, phone, whatsapp },
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // console.log('Listing updated:', updatedListing);
    res.json(updatedListing);
  } catch (error) {
    console.error('Failed to update listing:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a listing by ID
app.delete('/api/listings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    // console.log('Listing deleted:', deletedListing);
    res.status(200).json({ message: 'Listing deleted successfully', listing: deletedListing });
  } catch (error) {
    console.error('Failed to delete listing:', error);
    res.status(400).json({ message: error.message });
  }
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Endpoint to send WhatsApp message
app.post('/api/whatsapp', async (req, res) => {
  const accountSid = process.env.ACCOUNTSID;
  const authToken = process.env.AUTHTOKEN;
  const client = new twilio(accountSid, authToken);

  const { property } = req.body;

  const messageBody = `Property Details:\n\n` +
    `Title: ${property.title}\n` +
    `Price: ${property.price}\n` +
    `City: ${property.city}\n` +
    `Location: ${property.location}\n` +
    `Property Type: ${property.propertyType}\n` +
    `Beds: ${property.beds}\n\n`;

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUM, // Replace with your Twilio WhatsApp number
      to: `whatsapp:${property.broker.whatsapp}`, // Replace with recipient's WhatsApp number
      body: messageBody,
    });

    // console.log('WhatsApp message sent successfully');
    res.status(200).json({ message: 'WhatsApp message sent successfully' });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ message: 'Failed to send WhatsApp message' });
  }
});
