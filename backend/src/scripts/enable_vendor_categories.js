import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const categories = await db.collection('servicecategories').find({
    slug: { $in: ['electrical-services', 'ac-hvac-services', 'plumbing-services', 'appliance-repair', 'carpentry-furniture'] }
  }).toArray();

  const categoryIds = categories.map(c => c._id);
  console.log('Categories to enable:', categories.map(c => `${c.name} (${c._id})`));

  const updateRes = await db.collection('vendorprofiles').updateOne(
    { user: new mongoose.Types.ObjectId('6ae0213770d51a1f67ac7505') },
    {
      $set: {
        categories: categoryIds,
        skills: ['Electrical Work', 'AC Repair & Servicing', 'Appliance Diagnostics', 'Fan Installation']
      }
    }
  );

  console.log('Update result:', updateRes);
  await mongoose.disconnect();
}
run();
