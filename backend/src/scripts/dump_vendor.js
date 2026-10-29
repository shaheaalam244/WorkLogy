import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const vendor = await db.collection('vendorprofiles').findOne({ user: new mongoose.Types.ObjectId('6ae0213770d51a1f67ac7505') });
  console.log('Vendor Profile:', JSON.stringify(vendor, null, 2));

  await mongoose.disconnect();
}
run();
