import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const jobs = await db.collection('jobs').find().sort({ createdAt: -1 }).limit(10).toArray();
  for (const j of jobs) {
    const cat = await db.collection('servicecategories').findOne({ _id: j.category });
    const cust = await db.collection('users').findOne({ _id: j.customer });
    console.log({
      id: j._id.toString(),
      title: j.title,
      status: j.status,
      categoryName: cat?.name,
      categoryId: j.category?.toString(),
      customerName: cust?.name,
      customerEmail: cust?.email,
      locality: j.location?.locality,
      city: j.location?.city,
      coordinates: j.location?.coordinates,
      address: j.location?.address,
      urgency: j.urgency,
      budget: j.budget,
      createdAt: j.createdAt
    });
  }
  await mongoose.disconnect();
}
run();
