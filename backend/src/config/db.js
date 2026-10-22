import mongoose from 'mongoose';

export const connectDB = async (retries = 5, delay = 2000) => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/worklogy';

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connection active.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err?.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting auto-reconnect...');
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host} [db: ${conn.connection.name}]`);
      return conn;
    } catch (error) {
      console.warn(`MongoDB Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  console.error('Failed to establish MongoDB connection after all retries.');
  return null;
};

