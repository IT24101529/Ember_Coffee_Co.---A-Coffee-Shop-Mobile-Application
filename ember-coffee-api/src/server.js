import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import promoRoutes from './routes/promoRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import storeReviewRoutes from './routes/storeReviewRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/promotions', promoRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/store-reviews', storeReviewRoutes);

// Global error handler (must be last)
app.use(errorMiddleware);

// Start server — bind immediately so Railway's health check doesn't time out
// while waiting for the DB connection to resolve.
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});

export default app;
