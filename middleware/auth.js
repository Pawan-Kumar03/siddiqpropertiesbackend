import jwt from 'jsonwebtoken';
import User from '../models/User'; // Adjust the path if needed

const auth = async (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Remove 'Bearer ' from token
    const bearerToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;
