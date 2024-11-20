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
import nodemailer from 'nodemailer'; 
import crypto from 'crypto'; 
import { body, validationResult } from 'express-validator';
const multer = require('multer');

dotenv.config();

const app = express();
// Middleware to handle large payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = user; // Attach the user object to the request
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ message: 'Invalid token.', error: error.message });
  }
};



// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, dbName: 'PropertySales' })
  .then(() => {
    console.log('Database connected successfully');
    console.log('Mongo URI:', process.env.MONGO_URI);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection error:', err));

// CORS configuration
const allowedOrigins = [
  'https://www.investibayt.com', // Updated production frontend
  'https://frontend-git-main-pawan-togas-projects.vercel.app' // Keeping the old domain in case you need to support both
];
// app.use(cors({
//   origin: 'https://www.investibayt.com',  // Allow only this origin
//   methods: ["GET", "POST", "PUT", "DELETE"],  // Allow only the necessary HTTP methods
//   credentials: true,  // Enable credentials if you're using cookies or authentication tokens
// }));

// app.use(cors({ //for testing purpose
//   origin: '*', // Allow all origins for testing
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true,
// }));

app.use(cors({
  origin: (origin, callback) => {
    // If no origin is provided (e.g., from Postman or other testing tools)
    if (!origin) {
      return callback(null, true);
    }
    
    // List of allowed origins
    const allowedOrigins = [
      'https://www.investibayt.com', // Frontend production URL
      'https://investibayt.com', // Ensure this matches exactly
      'https://frontend-git-main-pawan-togas-projects.vercel.app' // Old frontend URL (in case you need support)
    ];

    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);  // Origin is allowed
    } else {
      const errorMsg = `CORS policy does not allow access from origin: ${origin}`;
      return callback(new Error(errorMsg), false);  // Origin is not allowed
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,  // Allow credentials (cookies, headers)
}));


app.get('/', (req, res) => {
  res.status(200).send('Backend is running.');
});


// Email setup (using nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
  },
});
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

// const upload = multer({
//   storage: storageMultiple,
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed!'), false);
//     }
//   }
// }).array('images', 12);
 // Handle multiple file uploads with field name 'images'
// app.use('/api/listings', auth);
const uploadMultiple = multer({
  storage: storageMultiple,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit for each file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).array('images', 12); // Handle multiple file uploads with field name 'images'

// Configure multer to store uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // The folder where files will be saved
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));  // Use unique filenames
  }
});

// Initialize multer with the storage configuration
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 100 * 1024 * 1024 } // Limit file size to 100 MB
});
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

    user.authToken = token;
    user.authTokenExpires = Date.now() + 3600000; // Token expiry set to 1 hour
    await user.save();

    res.status(201).json({ token, userId: user._id });
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

    // Store the token and expiry date in the database
    user.authToken = token;
    user.authTokenExpires = Date.now() + 3600000; // Token expiry set to 1 hour
    await user.save();

    res.json({
      token,
      userId: user._id,
      username: user.name,
      email: user.email,
      isVerified: user.isVerified // Include verification status in response
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


app.put('/api/profile', auth, async (req, res) => {
  const { name, email, password } = req.body;
  try {
      const user = await User.findById(req.user._id);

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      user.name = name || user.name;
      user.email = email || user.email;

      if (password) {
          user.password = password; // Assuming pre-save hook will hash it
      }

      await user.save();

      res.json({ name: user.name, email: user.email });
  } catch (error) {
      console.error('Profile update error:', error.message);
      res.status(500).json({ message: 'Server error' });
  }
});

// Verify user
app.post('/api/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'User verified successfully' });
  } catch (error) {
    console.error('Verification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// Verify email
app.get('/api/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.redirect('https://www.investibayt.com/');
  } catch (error) {
    console.error('Email verification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/refresh-token', auth, async (req, res) => {
  try {
      const payload = { userId: req.user._id };
      const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Update the authToken and its expiry in the database
      req.user.authToken = newToken;
      req.user.authTokenExpires = Date.now() + 3600000; // Token expiry set to 1 hour
      await req.user.save();

      res.json({ token: newToken });
  } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ message: 'Server error' });
  }
});


// Check verification status
app.get('/api/verify/status', auth, async (req, res) => {
  try {
      const user = await User.findById(req.user._id);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.json({ isVerified: user.isVerified });
  } catch (error) {
      console.error('Verification status error:', error.message);
      res.status(500).json({ message: 'Server error' });
  }
});

// Request email verification link
app.post('/api/verify/request', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    const verificationUrl = `https://www.investibayt.com/verify/${verificationToken}`;
    console.log('verificationToken: ',verificationToken)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Email Verification from MASKAN',
      text: `Please verify your profile by clicking the following link: ${verificationUrl}`,
    });

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Verification request error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


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
// POST request to create a new listing
app.post('/api/listings', auth, uploadMultiple, async (req, res) => {
  try {
    const {
      title, price, city, location, country, propertyType, beds, baths, description,
      propertyReferenceId, building, neighborhood, developments, landlordName, reraTitleNumber,
      reraPreRegistrationNumber, agentName, agentCallNumber, agentEmail, agentWhatsapp,
      extension, broker, phone, email, whatsapp, purpose, status, amenities
    } = req.body;

    console.log('Request body:', req.body); // Logs the received form data

    // Check if files are uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }

    // Upload images to Blob storage
    const images = await Promise.all(
      req.files.map(async (file) => {
        const blobName = `${Date.now()}-${file.originalname}`;  // Unique name for each file
        const blobResult = await put(blobName, file.buffer, { access: 'public' });
        return blobResult.url;
      })
    );

    // Create a new listing object
    const listing = new Listing({
      title,
      price,
      city,
      location,
      country,
      propertyType,
      beds,
      baths,
      description,
      propertyReferenceId,
      building,
      neighborhood,
      developments,
      landlordName,
      reraTitleNumber,
      reraPreRegistrationNumber,
      agentName,
      agentCallNumber,
      agentEmail,
      agentWhatsapp,
      image: images[0] || '', // First image as a default
      images,  // Array of uploaded image URLs
      extension,
      broker,
      phone,
      email,
      whatsapp,
      purpose,
      status,
      amenities: amenities || [],
      user: req.user._id, // Associate the listing with the logged-in user
    });

    // Save the listing to the database
    const savedListing = await listing.save();

    // Add the new listing to the user's list of listings
    req.user.listings = req.user.listings || [];
    req.user.listings.push(savedListing._id);
    await req.user.save();

    // Respond with the created listing
    res.status(201).json(savedListing);
  } catch (error) {
    console.error('Error creating listing:', error.message);
    res.status(500).json({ message: 'Error creating listing.', error: error.message });
  }
});



// Update the PUT route to handle multipart form data
app.put('/api/listings/:id', auth, uploadMultiple, async (req, res) => {
  const { id } = req.params;

  try {
      const listing = await Listing.findById(id);
      if (!listing) {
          return res.status(404).json({ message: 'Listing not found' });
      }



      // Handle image updates
      const images = req.files ? await Promise.all(req.files.map(async (file) => {
          const blobName = `${Date.now()}-${file.originalname}`;
          const blobResult = await put(blobName, file.buffer, { access: 'public' });
          return blobResult.url;
      })) : [];

      // Update the listing with new data
      const updatedData = { ...req.body, images: images.length > 0 ? images : listing.images };
      const updatedListing = await Listing.findByIdAndUpdate(id, updatedData, { new: true });
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


    await Listing.findByIdAndDelete(id); 
    res.json({ message: 'Listing removed' });
  } catch (error) {
    console.error("Error deleting listing:", error); // Log the error
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/password-reset-request', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    const resetUrl = `https://www.investibayt.com/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetUrl}`,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = newPassword; // Ensure to hash this password before saving
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error' });
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
      if (!property || property.length === 0) {
          return res.status(404).json({ message: 'Property not found' });
      }
      res.json(property);
  } catch (error) {
      console.error('Error fetching property:', error); // Debugging line
      res.status(500).json({ message: 'Server error' });
  }
});


// Route to get listings based on the city
app.get('/api/properties', async (req, res) => {
  try {
    const { city } = req.query;

    // Build the query object
    const query = {};
    if (city) {
      query.city = city;
    }

    const listings = await Listing.find(query);

    if (!listings || listings.length === 0) {
      return res.status(404).json({ message: 'No listings found for this city' });
    }

    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


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

