import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import Zone from '../models/Zone.js';
import Locality from '../models/Locality.js';
import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import ServiceCategory from '../models/ServiceCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI missing from .env');
  process.exit(1);
}

// Mapping Excel Skill string to WorkLogy ServiceCategory slug
const SKILL_TO_CATEGORY_SLUG = {
  'AC Technician': 'ac-hvac-services',
  'Appliance Repair': 'appliance-repair',
  'Carpenter': 'carpentry-furniture',
  'Cleaner': 'home-cleaning',
  'Electrician': 'electrical-services',
  'Mason': 'construction-masonry',
  'Mechanic': 'vehicle-repair',
  'Painter': 'painting-services',
  'Plumber': 'plumbing-services',
  'RO Technician': 'ro-water-purifier',
  'Tile Worker': 'tile-flooring',
  'Welder': 'glass-aluminium'
};

async function seed() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected successfully.');

    // 1. Read JSON data
    const zonesPath = path.resolve(__dirname, '../../data/zones.json');
    const localitiesPath = path.resolve(__dirname, '../../data/localities.json');
    const vendorsPath = path.resolve(__dirname, '../../data/vendors.json');

    const zonesData = JSON.parse(fs.readFileSync(zonesPath, 'utf8'));
    const localitiesData = JSON.parse(fs.readFileSync(localitiesPath, 'utf8'));
    const vendorsData = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));

    // 2. Seed Zones (18 zones)
    console.log(`Seeding ${zonesData.length} Zones...`);
    for (const z of zonesData) {
      await Zone.findOneAndUpdate(
        { zoneId: z.zoneId },
        { $set: z },
        { upsert: true, new: true }
      );
    }
    console.log(`Successfully verified ${zonesData.length} Zones.`);

    // 3. Seed Localities (90 localities)
    console.log(`Seeding ${localitiesData.length} Localities...`);
    for (const loc of localitiesData) {
      await Locality.findOneAndUpdate(
        { localityId: loc.localityId },
        { $set: loc },
        { upsert: true, new: true }
      );
    }
    console.log(`Successfully verified ${localitiesData.length} Localities.`);

    // 4. Fetch Category Map
    const allCategories = await ServiceCategory.find({}).lean();
    const categoryMap = {};
    for (const cat of allCategories) {
      categoryMap[cat.slug] = cat;
    }
    const defaultCat = allCategories.find((c) => c.slug === 'other-services') || allCategories[0];

    // 5. Update existing anchor vendors with real Lucknow coordinates
    console.log('Updating existing flagship vendors with zone & coordinates...');
    const flagshipUpdates = [
      {
        email: 'elena.rostova@worklogy.com',
        zoneId: 'LKO-Z01',
        zoneName: 'East Lucknow',
        locality: 'Gomti Nagar',
        coordinates: { lat: 26.8500, lng: 80.9984 },
        location: { type: 'Point', coordinates: [80.9984, 26.8500] }
      },
      {
        email: 'carlos.mendez@worklogy.com',
        zoneId: 'LKO-Z02',
        zoneName: 'East-Central Lucknow',
        locality: 'Indira Nagar',
        coordinates: { lat: 26.8833, lng: 80.9833 },
        location: { type: 'Point', coordinates: [80.9833, 26.8833] }
      },
      {
        email: 'vendor@worklogy.com',
        zoneId: 'LKO-Z07',
        zoneName: 'Central Lucknow',
        locality: 'Hazratganj',
        coordinates: { lat: 26.8467, lng: 80.9462 },
        location: { type: 'Point', coordinates: [80.9462, 26.8467] }
      }
    ];

    for (const flag of flagshipUpdates) {
      const userDoc = await User.findOne({ email: flag.email });
      if (userDoc) {
        await VendorProfile.findOneAndUpdate(
          { user: userDoc._id },
          {
            $set: {
              zoneId: flag.zoneId,
              zoneName: flag.zoneName,
              locality: flag.locality,
              coordinates: flag.coordinates,
              location: flag.location,
              approvalStatus: 'approved',
              vendorServiceRadiusKm: 15
            }
          }
        );
      }
    }

    // 6. Seed vendors from Excel dataset
    console.log(`Synchronizing workbook vendors (${vendorsData.length} records)...`);
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    let seededCount = 0;

    for (const v of vendorsData) {
      const email = `vendor_${v.vendorId.toLowerCase()}@worklogy.in`;
      const catSlug = SKILL_TO_CATEGORY_SLUG[v.skill] || 'other-services';
      const matchedCat = categoryMap[catSlug] || defaultCat;

      // Upsert User
      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            name: v.name,
            email,
            password: defaultPasswordHash,
            role: 'vendor',
            phone: v.phone || `+91 90000${String(v.vendorId).replace(/\D/g, '').padStart(5, '0')}`,
            avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80`
          }
        },
        { upsert: true, new: true }
      );

      // Upsert VendorProfile
      const businessName = `${v.name} (${v.skill} Expert)`;
      await VendorProfile.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            businessName,
            tagline: `Professional ${v.skill} in ${v.locality}, ${v.zoneName}`,
            bio: `Certified ${v.skill} with ${v.experienceYears} years of hands-on experience in ${v.locality} and surrounding zones.`,
            categories: [matchedCat._id],
            services: [
              {
                category: matchedCat._id,
                categoryName: matchedCat.name,
                title: `${v.skill} Diagnostic & Service`,
                description: `Standard professional service and on-site inspection for ${v.skill} requirements.`,
                pricingType: 'fixed',
                price: v.baseVisitCharge || 299,
                duration: '1 - 2 hours',
                experienceYears: v.experienceYears,
                serviceArea: v.locality,
                isActive: true
              }
            ],
            city: 'Lucknow',
            zoneId: v.zoneId,
            zoneName: v.zoneName,
            locality: v.locality,
            vendorServiceRadiusKm: v.vendorServiceRadiusKm || 5,
            baseVisitCharge: v.baseVisitCharge || 299,
            coordinates: v.coordinates,
            location: v.location,
            hourlyRate: v.baseVisitCharge || 299,
            experienceYears: v.experienceYears,
            rating: v.rating || 4.8,
            completedJobsCount: v.completedJobsCount || 10,
            approvalStatus: 'approved',
            'verifiedBadge.status': v.verificationStatus === 'verified' ? 'verified' : 'pending',
            'availability.isAvailableNow': v.isAvailableNow
          }
        },
        { upsert: true, new: true }
      );

      seededCount++;
    }

    console.log(`Successfully synchronized ${seededCount} vendors with zones, localities, and GeoJSON 2dsphere locations.`);

    // 7. Verification Summary
    const totalZones = await Zone.countDocuments();
    const totalLocalities = await Locality.countDocuments();
    const totalVendors = await VendorProfile.countDocuments({ approvalStatus: 'approved' });

    console.log('\n=== SEED SUMMARY ===');
    console.log(`Total Zones in DB: ${totalZones}`);
    console.log(`Total Localities in DB: ${totalLocalities}`);
    console.log(`Total Approved Vendors in DB: ${totalVendors}`);
    console.log('Seeding completed cleanly.');

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed with error:', err);
    process.exit(1);
  }
}

seed();
