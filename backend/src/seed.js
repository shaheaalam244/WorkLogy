import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import VendorProfile from './models/VendorProfile.js';
import CustomerProfile from './models/CustomerProfile.js';
import ServiceCategory from './models/ServiceCategory.js';
import Job from './models/Job.js';
import { SERVICE_DOMAINS } from './utils/catalogue.js';

dotenv.config();

export async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas!');

    // 1. Seed or Upsert 30 Canonical Categories
    const categoryMap = {};
    for (const cat of SERVICE_DOMAINS) {
      let doc = await ServiceCategory.findOne({ slug: cat.slug });
      if (!doc) {
        doc = await ServiceCategory.create({ ...cat, isActive: true });
      } else {
        doc = await ServiceCategory.findByIdAndUpdate(doc._id, { ...cat, isActive: true }, { new: true });
      }
      categoryMap[cat.slug] = doc._id;
    }
    console.log(`Synced ${Object.keys(categoryMap).length} service categories.`);

    // 2. Seed Default Users
    // Remove existing demo users to re-seed clean hashes
    await User.deleteMany({ email: { $in: ['customer@worklogy.com', 'vendor@worklogy.com', 'elena.rostova@worklogy.com', 'carlos.mendez@worklogy.com', 'admin@worklogy.com'] } });

    // Customer Alex Johnson
    const customerUser = await User.create({
      name: 'Alex Johnson',
      email: 'customer@worklogy.com',
      password: 'password123',
      role: 'customer',
      phone: '+1 (555) 234-5678',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true
    });
    await CustomerProfile.findOneAndUpdate(
      { user: customerUser._id },
      { user: customerUser._id, totalJobsPosted: 2 },
      { upsert: true }
    );

    // Vendor Marcus Vance (Electrician)
    const vendor1 = await User.create({
      name: 'Marcus Vance',
      email: 'vendor@worklogy.com',
      password: 'password123',
      role: 'vendor',
      phone: '+1 (555) 345-6789',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true
    });
    await VendorProfile.findOneAndUpdate(
      { user: vendor1._id },
      {
        user: vendor1._id,
        businessName: 'Apex Master Electrical & HVAC',
        tagline: 'Licensed Master Electrician & Climate Control Systems',
        bio: 'Over 12 years of residential & commercial wiring experience with 24/7 rapid dispatch in the tri-state area.',
        hourlyRate: 75,
        rating: 4.96,
        reviewCount: 142,
        completedJobsCount: 188,
        experienceYears: 12,
        primaryCategory: categoryMap['electrical-services'],
        categories: [categoryMap['electrical-services'], categoryMap['ac-hvac-services']],
        verifiedBadge: { status: 'verified', verifiedAt: new Date() },
        services: [
          { title: 'Electrical Panel Upgrade 200A', description: 'Complete sub-panel wiring and circuit breakers', price: 1800, duration: '4 hours' },
          { title: 'Smart EV Charger Installation', description: 'Level 2 EV fast charger installation', price: 650, duration: '2 hours' }
        ]
      },
      { upsert: true }
    );

    // Vendor Elena Rostova (Plumber)
    const vendor2 = await User.create({
      name: 'Elena Rostova',
      email: 'elena.rostova@worklogy.com',
      password: 'password123',
      role: 'vendor',
      phone: '+1 (555) 456-7890',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true
    });
    await VendorProfile.findOneAndUpdate(
      { user: vendor2._id },
      {
        user: vendor2._id,
        businessName: 'FlowPro Master Plumbing',
        tagline: '24/7 Emergency Diagnostics & Re-piping Specialists',
        bio: 'Master plumber specialized in water heater repair, emergency drain unblocking, and commercial piping.',
        hourlyRate: 85,
        rating: 4.92,
        reviewCount: 98,
        completedJobsCount: 134,
        experienceYears: 9,
        primaryCategory: categoryMap['plumbing-services'],
        categories: [categoryMap['plumbing-services']],
        verifiedBadge: { status: 'verified', verifiedAt: new Date() },
        services: [
          { title: 'Tankless Water Heater Installation', description: 'Energy-efficient high output unit setup', price: 1400, duration: '3 hours' },
          { title: 'Sewer Line Camera Inspection', description: 'High-definition endoscopic pipeline diagnostic', price: 250, duration: '1 hour' }
        ]
      },
      { upsert: true }
    );

    // Vendor Carlos Mendez (Carpenter)
    const vendor3 = await User.create({
      name: 'Carlos Mendez',
      email: 'carlos.mendez@worklogy.com',
      password: 'password123',
      role: 'vendor',
      phone: '+1 (555) 567-8901',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true
    });
    await VendorProfile.findOneAndUpdate(
      { user: vendor3._id },
      {
        user: vendor3._id,
        businessName: 'Precision Carpentry & Millwork',
        tagline: 'Fine architectural woodworking & deck engineering',
        bio: 'Custom built-in shelving, cabinetry, structural decks, and architectural millwork.',
        hourlyRate: 70,
        rating: 4.88,
        reviewCount: 76,
        completedJobsCount: 92,
        experienceYears: 10,
        primaryCategory: categoryMap['carpentry-furniture'],
        categories: [categoryMap['carpentry-furniture']],
        verifiedBadge: { status: 'verified', verifiedAt: new Date() },
        services: [
          { title: 'Custom Built-in Bookshelves', description: 'Hardwood floor-to-ceiling built-in units', price: 2200, duration: '8 hours' },
          { title: 'Door & Lock Framing Repair', description: 'Frame squaring, strike plate adjustment', price: 180, duration: '1 hour' }
        ]
      },
      { upsert: true }
    );

    // Admin Sarah Connor
    const adminUser = await User.create({
      name: 'Sarah Connor',
      email: 'admin@worklogy.com',
      password: 'password123',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true
    });

    // 3. Seed Initial Real Jobs if none exist
    const currentJobCount = await Job.countDocuments();
    if (currentJobCount === 0) {
      const sampleJobs = [
        {
          title: 'Main Circuit Breaker Tripping & Sub-Panel Inspection',
          description: 'Our main electrical panel keeps tripping whenever the AC and heavy appliances run simultaneously. Looking for a certified master electrician to diagnose load balance and replace faulty breakers.',
          category: categoryMap['electrical-services'],
          customer: customerUser._id,
          budget: { type: 'fixed', amount: 1500 },
          location: { address: 'Vibhuti Khand, Gomti Nagar', city: 'Lucknow', state: 'UP', zipCode: '226010' },
          urgency: 'high',
          status: 'open',
          preferredDate: 'Tomorrow Morning',
          preferredTime: '09:00 AM - 12:00 PM',
          additionalInstructions: 'Please bring testing equipment for load draw diagnostics.'
        },
        {
          title: 'Kitchen Sink Dual-Basin Drain Leak & Disposal Replacement',
          description: 'Water leaking under the double basin kitchen sink during heavy use. Need replacement of P-trap, pipeline leak sealing, and new drain fitting installation.',
          category: categoryMap['plumbing-services'],
          customer: customerUser._id,
          budget: { type: 'fixed', amount: 850 },
          location: { address: 'Park Road, Hazratganj', city: 'Lucknow', state: 'UP', zipCode: '226001' },
          urgency: 'medium',
          status: 'open',
          preferredDate: 'This Friday',
          preferredTime: 'Afternoon',
          additionalInstructions: 'Replacement fittings and pipes are already on-site.'
        },
        {
          title: 'Ductless Mini-Split AC Freon Leak & Spring Tune-Up',
          description: 'Living room split AC unit blowing lukewarm air. Air filter was cleaned but cooling coil shows low pressure. Need certified HVAC technician for gas charge and leakage test.',
          category: categoryMap['ac-hvac-services'],
          customer: customerUser._id,
          budget: { type: 'fixed', amount: 2200 },
          location: { address: 'Sector 14, Indira Nagar', city: 'Lucknow', state: 'UP', zipCode: '226016' },
          urgency: 'high',
          status: 'open',
          preferredDate: 'Immediate / Urgent',
          preferredTime: 'Today if possible',
          additionalInstructions: 'Outdoor unit is on 2nd floor balcony with easy terrace access.'
        },
        {
          title: 'Custom Hardwood Shelving & Cabinet Door Realignment',
          description: 'Need skilled carpenter to build two floating display shelves (6 feet wide each) and re-align kitchen cabinet doors with precision hardware adjustments.',
          category: categoryMap['carpentry-furniture'],
          customer: customerUser._id,
          budget: { type: 'fixed', amount: 3500 },
          location: { address: 'Mahanagar Extension', city: 'Lucknow', state: 'UP', zipCode: '226006' },
          urgency: 'low',
          status: 'open',
          preferredDate: 'Next Weekend',
          preferredTime: 'Flexible',
          additionalInstructions: 'Walls are solid plaster.'
        }
      ];

      await Job.insertMany(sampleJobs);
      console.log(`Seeded ${sampleJobs.length} initial real jobs.`);
    }

    console.log('Database seed completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
