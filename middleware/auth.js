import jwt from 'jsonwebtoken';
import User from './model/User.js'; // Your Mongoose User model
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const auth = async (req, res, next) => {
  try {
    // Extract token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or invalid' });
    }

    const token = authHeader.split(' ')[1]; // Get the token part

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user from the decoded token payload
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user information to the request object
    req.user = user;

    next(); // Proceed to the next middleware/route
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

export default auth;
