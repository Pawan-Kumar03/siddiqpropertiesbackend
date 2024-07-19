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
import Listing from './models/Listing.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post('/api/listings', upload.single('images'), async (req, res) => {
  const { title, price, city, location, propertyType, beds, baths, description, propertyReferenceId, building, neighborhood, landlordName, reraTitleNumber, reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp, extension, broker, phone, email, whatsapp, purpose, status } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

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
    image: imageUrl,
    extension,
    broker,
    phone,
    email,
    whatsapp,
    purpose,
    status // Add this line
  });

  try {
    const savedListing = await listing.save();
    res.status(201).json(savedListing);
  } catch (error) {
    console.error('Error adding listing:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/api/listings/:id', upload.array('images', 12), async (req, res) => {
  const { id } = req.params;
  const { 
    title, price, city, location, propertyType, beds, baths, description, 
    propertyReferenceId, building, neighborhood, landlordName, reraTitleNumber, 
    reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp,
    extension, broker, email, phone, whatsapp, purpose, status // Add this line
  } = req.body;
  const images = req.files.map(file => `/uploads/${file.filename}`);

  try {
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { 
        title, price, city, location, propertyType, beds, baths, description, 
        propertyReferenceId, building, neighborhood, landlordName, reraTitleNumber, 
        reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp,
        extension, images, broker, email, phone, whatsapp, purpose, status // Add this line
      },
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

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

// WhatsApp API
app.post('/api/whatsapp', async (req, res) => {
  const accountSid = process.env.ACCOUNTSID;
  const authToken = process.env.AUTHTOKEN;
  const client = require('twilio')(accountSid, authToken);

  const { property } = req.body;

  const messageBody = `Property Details:\n\n` +
    `Title: ${property.title}\n` +
    `Price: ${property.price}\n` +
    `City: ${property.city}\n` +
    `Location: ${property.location}\n` +
    `Property Type: ${property.propertyType}\n` +
    `Beds: ${property.beds}\n` +
    `Baths: ${property.baths}\n` +
    `Description: ${property.description}\n` +
    `Property Reference ID: ${property.propertyReferenceId}\n` +
    `Building: ${property.building}\n` +
    `Neighborhood: ${property.neighborhood}\n` +
    `Landlord Name: ${property.landlordName}\n` +
    `RERA Title Number: ${property.reraTitleNumber}\n` +
    `RERA Pre-Registration Number: ${property.reraPreRegistrationNumber}\n` +
    `Agent Name: ${property.agentName}\n` +
    `Agent Call Number: ${property.agentCallNumber}\n` +
    `Agent Email: ${property.agentEmail}\n` +
    `Agent WhatsApp: ${property.agentWhatsapp}\n\n`;

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUM,
      to: `whatsapp:${property.agentWhatsapp}`,
      body: messageBody,
    });

    res.status(200).json({ message: 'WhatsApp message sent successfully' });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ message: 'Failed to send WhatsApp message' });
  }
});