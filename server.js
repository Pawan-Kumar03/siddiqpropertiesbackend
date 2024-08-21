import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import Listing from './models/Listing.js';
import { put } from '@vercel/blob'; // Correct import statement

dotenv.config();

const app = express();

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, dbName: 'PropertySales' })
  .then(() => {
    console.log('Database connected successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection error:', err));

// CORS configuration
const allowedOrigins = [
  'https://frontend-git-main-pawan-togas-projects.vercel.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Multer configuration for handling single file upload
const storageSingle = multer.memoryStorage();

const uploadSingle = multer({
  storage: storageSingle,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit for each file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).single('images'); // Handle single file upload with field name 'images'
// Multer configuration for handling multiple file uploads
const storageMultiple = multer.memoryStorage();

const upload = multer({
  storageMultiple,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit for each file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).array('images', 12); // Handle multiple file uploads with field name 'images'

const uploadMultiple = multer({
  storage: storageMultiple,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit for each file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).array('images', 12); // Handle multiple file uploads with field name 'images'

// POST request to add a new listing
app.post('/api/listings', upload, async (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ message: req.fileValidationError });
  }
  
  const { title, price, city, location, propertyType, beds, baths, extension, landlord, broker, phone, email, whatsapp, purpose, status, description, propertyReferenceId, building, neighborhood, landlordName, reraTitleNumber, reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp } = req.body;

  if (!status || !purpose) {
    return res.status(400).json({ message: 'Status and purpose are required.' });
  }

  try {
    const images = req.files ? await Promise.all(req.files.map(async (file) => {
      const blobName = `${Date.now()}-${file.originalname}`;
      const blobResult = await put(blobName, file.buffer, { access: 'public' });
      return blobResult.url;
    })) : [];

    const listing = new Listing({
      title,
      price,
      city,
      location,
      propertyType,
      beds,
      baths,
      description,
      propertyReferenceId,
      building,
      neighborhood,
      landlordName,
      reraTitleNumber,
      reraPreRegistrationNumber,
      agentName,
      agentCallNumber,
      agentEmail,
      agentWhatsapp,
      image: images.length === 1 ? images[0] : '', // Store single image
      images: images.length > 1 ? images : [], // Store multiple images
      extension,
      broker,
      phone,
      email,
      whatsapp,
      purpose,
      status
    });

    const savedListing = await listing.save();
    res.status(201).json(savedListing);
  } catch (error) {
    console.error('Error adding listing:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// PUT request to update a listing
app.put('/api/listings/:id', upload, async (req, res) => {
  const { id } = req.params;
  const {
    title, price, city, location, propertyType, beds, landlord, baths, extension, broker,
    email, phone, whatsapp, description, propertyReferenceId, building, neighborhood, landlordName,
    reraTitleNumber, reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp, 
    purpose, status
  } = req.body;

  try {
    // Find the existing listing to retain existing images
    const existingListing = await Listing.findById(id);
    if (!existingListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // If new images are uploaded, append them to existing images; otherwise, retain the current images
    const newImages = req.files ? await Promise.all(req.files.map(async (file) => {
      const blobName = `${Date.now()}-${file.originalname}`;
      const blobResult = await put(blobName, file.buffer, { access: 'public' });
      return blobResult.url;
    })) : [];

    const images = newImages.length > 0 ? [...existingListing.images, ...newImages] : existingListing.images;

    // Update the listing with the provided fields and updated images
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      {
        title, price, city, location, propertyType, beds, landlord, baths, extension, broker,
        email, phone, whatsapp, description, propertyReferenceId, building, neighborhood,
        landlordName, reraTitleNumber, reraPreRegistrationNumber, agentName, agentCallNumber,
        agentEmail, agentWhatsapp, purpose, status,
        images
      },
      { new: true }
    );

    res.json(updatedListing);
  } catch (error) {
    console.error('Failed to update listing:', error);
    res.status(400).json({ message: error.message });
  }
});




// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Define API endpoints
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await Listing.find();
    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
});
app.get('/api/listings/:city', async (req, res) => {
  const { city } = req.params;
  try {
      const listings = await Listing.find({ city }); // Adjust query as needed
      res.json(listings.length ? listings : []);
  } catch (error) {
      console.error('Error fetching listings:', error);
      res.status(500).json({ message: 'Server Error' });
  }
});


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

app.delete('/api/listings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    res.status(200).json({ message: 'Listing deleted successfully', listing: deletedListing });
  } catch (error) {
    console.error('Failed to delete listing:', error);
    res.status(400).json({ message: error.message });
  }
});


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
      from: process.env.TWILIO_WHATSAPP_NUM,
      to: `whatsapp:${property.broker.whatsapp}`,
      body: messageBody,
    });

    res.status(200).json({ message: 'WhatsApp message sent successfully' });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ message: 'Failed to send WhatsApp message' });
  }
});

