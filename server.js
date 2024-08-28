import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import Listing from './models/Listing.js';
import { put } from '@vercel/blob'; 
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

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
  origin: function(origin, callback){
    // Allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// app.use(cors({
//   origin: allowedOrigins,
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true,
// }));

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

app.post('/api/signup', [
  body('name').not().isEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({ name, email, password });
    await user.save();

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Include username in the response
    res.json({
      token,
       userId: user._id,
      username: user.name 
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Authentication Middleware
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid', error: error.message });
  }
};

// Add this route to your Express server
app.get('/api/user-listings', auth, async (req, res) => {
  try {
      const user = await User.findById(req.user._id).populate('listings'); // Populate listings
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json(user.listings);
  } catch (error) {
      console.error('Error fetching user listings:', error);
      res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/listings', auth, upload, async (req, res) => {
  const {
    title, price, city, location, propertyType, beds, baths, description,
    propertyReferenceId, building, neighborhood, landlordName, reraTitleNumber,
    reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp,
    extension, broker, phone, email, whatsapp, purpose, status
  } = req.body;
  console.log('Request body:', req.body);
// Check if req.user.listings is defined and an array
if (!req.user.listings) {
  req.user.listings = [];  // Initialize if undefined
}
  try {
    const images = req.files ? await Promise.all(req.files.map(async (file) => {
      const blobName = `${Date.now()}-${file.originalname}`;
      const blobResult = await put(blobName, file.buffer, { access: 'public' });
      return blobResult.url;
    })) : [];

    const listing = new Listing({
      title, price, city, location, propertyType, beds, baths, description,
      propertyReferenceId, building, neighborhood, landlordName, reraTitleNumber,
      reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp,
      image: images.length === 1 ? images[0] : '', images: images.length > 1 ? images : [],
      extension, broker, phone, email, whatsapp, purpose, status,
      user: req.user._id // Associate the listing with the logged-in user
    });

    const savedListing = await listing.save();
    req.user.listings.push(savedListing._id);
    await req.user.save();
    res.status(201).json(savedListing);
  } catch (error) {
    console.error('Error creating listing:', error);  
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/api/listings/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Ensure the logged-in user owns the listing
    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update the listing with new data
    const updatedListing = await Listing.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/api/listings/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Ensure the logged-in user owns the listing
    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await listing.remove();
    res.json({ message: 'Listing removed' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});





// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});
app.get('/api/listings', async (req, res) => {
  const { city, location } = req.query;
  try {
    const query = {};
    if (city) query.city = city;
    if (location) query.location = location;

    const listings = await Listing.find(query);
    res.json(listings.length ? listings : []);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Server Error' });
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
  console.log('Received ID:', req.params.id); // Debugging line
  try {
      const property = await Listing.findById(req.params.id);
      console.log('Queried Property:', property); // Debugging line
      if (!property) {
          return res.status(404).json({ message: 'Property not found' });
      }
      res.json(property);
  } catch (error) {
      console.error('Error fetching property:', error); // Debugging line
      res.status(500).json({ message: 'Server error' });
  }
});


// app.get('/api/listings/:id', async (req, res) => {
//   const { id } = req.params;
  
//   try {
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: 'Invalid listing ID' });
//     }
    
//     const listing = await Listing.findById(id);
    
//     if (!listing) {
//       return res.status(404).json({ message: 'Listing not found' });
//     }
    
//     res.json(listing);
//   } catch (error) {
//     console.error('Error fetching listing:', error);
//     res.status(500).json({ message: 'Failed to fetch listing' });
//   }
// });


app.delete('/api/listings/:id',auth, async (req, res) => {
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

