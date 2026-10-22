import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const CANONICAL_DOMAINS = [
  {
    name: 'Electrical Services',
    slug: 'electrical-services',
    icon: 'Zap',
    filterGroup: 'home-maintenance',
    description: 'Certified electricians for wiring, panel upgrades, switchboards, lighting and fault diagnosis.',
    popular: true,
    sortOrder: 1,
    subcategories: [
      'Electrician',
      'Wiring and Rewiring',
      'Switchboard Repair',
      'Fan and Light Installation',
      'Inverter and Electrical Backup',
      'Electrical Fault Diagnosis'
    ]
  },
  {
    name: 'Plumbing Services',
    slug: 'plumbing-services',
    icon: 'Droplets',
    filterGroup: 'home-maintenance',
    description: 'Expert plumbers for pipe leakage, tap fittings, drainage, water tanks and bathroom repairs.',
    popular: true,
    sortOrder: 2,
    subcategories: [
      'Plumber',
      'Pipe Leakage Repair',
      'Tap and Faucet Repair',
      'Bathroom Fittings',
      'Drainage and Blockage',
      'Water Tank Services'
    ]
  },
  {
    name: 'AC & HVAC Services',
    slug: 'ac-hvac-services',
    icon: 'Wind',
    filterGroup: 'repair-installation',
    description: 'Complete air conditioning servicing, installation, gas charging and HVAC maintenance.',
    popular: true,
    sortOrder: 3,
    subcategories: [
      'AC Repair',
      'AC Installation',
      'AC Servicing',
      'Gas Charging',
      'Compressor Repair',
      'Commercial HVAC Maintenance'
    ]
  },
  {
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    icon: 'Cpu',
    filterGroup: 'repair-installation',
    description: 'Diagnostics and repairs for refrigerators, washing machines, microwaves and home appliances.',
    popular: true,
    sortOrder: 4,
    subcategories: [
      'Refrigerator Repair',
      'Washing Machine Repair',
      'Microwave Repair',
      'Cooler Repair',
      'Dishwasher Repair',
      'Small Appliance Repair'
    ]
  },
  {
    name: 'Carpentry & Furniture',
    slug: 'carpentry-furniture',
    icon: 'Hammer',
    filterGroup: 'home-maintenance',
    description: 'Skilled carpenters for custom woodwork, furniture repair, door fittings and cabinet assembly.',
    popular: true,
    sortOrder: 5,
    subcategories: [
      'Carpenter',
      'Furniture Repair',
      'Door and Window Repair',
      'Furniture Assembly',
      'Cabinet Installation',
      'Custom Woodwork'
    ]
  },
  {
    name: 'Home Cleaning',
    slug: 'home-cleaning',
    icon: 'Sparkles',
    filterGroup: 'cleaning',
    description: 'Comprehensive deep cleaning for homes, kitchens, bathrooms, sofas and post-renovation spaces.',
    popular: true,
    sortOrder: 6,
    subcategories: [
      'Home Deep Cleaning',
      'Bathroom Cleaning',
      'Kitchen Cleaning',
      'Sofa and Upholstery Cleaning',
      'Move-in and Move-out Cleaning',
      'Post-construction Cleaning'
    ]
  },
  {
    name: 'Painting Services',
    slug: 'painting-services',
    icon: 'Paintbrush',
    filterGroup: 'home-maintenance',
    description: 'Interior and exterior painting, wall putty preparation, texture finishes and wallpapering.',
    popular: true,
    sortOrder: 7,
    subcategories: [
      'Interior Painting',
      'Exterior Painting',
      'Wall Preparation',
      'Wallpaper Application',
      'Texture Painting',
      'Touch-up and Repainting'
    ]
  },
  {
    name: 'Pest Control',
    slug: 'pest-control',
    icon: 'Bug',
    filterGroup: 'cleaning',
    description: 'Targeted treatments for termites, cockroaches, mosquitoes, rodents and residential pests.',
    popular: false,
    sortOrder: 8,
    subcategories: [
      'Cockroach Control',
      'Termite Treatment',
      'Mosquito Control',
      'Rodent Control',
      'Ant Control',
      'General Pest Management'
    ]
  },
  {
    name: 'Locksmith Services',
    slug: 'locksmith-services',
    icon: 'KeyRound',
    filterGroup: 'repair-installation',
    description: 'Emergency lockout rescue, smart digital lock installation, key duplication and lock repairs.',
    popular: false,
    sortOrder: 9,
    subcategories: [
      'Lock Repair',
      'Lock Replacement',
      'Key Duplication',
      'Smart Lock Installation',
      'Door Lockout Assistance',
      'Commercial Lock Services'
    ]
  },
  {
    name: 'Vehicle Repair & Maintenance',
    slug: 'vehicle-repair',
    icon: 'Car',
    filterGroup: 'vehicle-services',
    description: 'On-demand car and bike servicing, mobile battery replacement, puncture fix and roadside aid.',
    popular: false,
    sortOrder: 10,
    subcategories: [
      'Car Repair',
      'Bike Repair',
      'Vehicle Servicing',
      'Battery Assistance',
      'Puncture Repair',
      'Roadside Assistance'
    ]
  },
  {
    name: 'Home Shifting & Packers',
    slug: 'packers-movers',
    icon: 'Truck',
    filterGroup: 'moving-construction',
    description: 'Reliable packing, loading, household shifting, furniture transit and office relocation.',
    popular: false,
    sortOrder: 11,
    subcategories: [
      'Household Shifting',
      'Office Relocation',
      'Packing and Unpacking',
      'Loading and Unloading',
      'Furniture Transportation',
      'Local Moving Assistance'
    ]
  },
  {
    name: 'Construction & Masonry',
    slug: 'construction-masonry',
    icon: 'HardHat',
    filterGroup: 'moving-construction',
    description: 'Brickwork, structural plastering, concrete casting, partition demolition and masonry repairs.',
    popular: false,
    sortOrder: 12,
    subcategories: [
      'Masonry',
      'Brickwork',
      'Plastering',
      'Concrete Work',
      'Wall Demolition',
      'Minor Structural Repairs'
    ]
  },
  {
    name: 'Tile & Flooring',
    slug: 'tile-flooring',
    icon: 'Layers',
    filterGroup: 'moving-construction',
    description: 'Vitrified tile laying, marble diamond polishing, granite countertops and epoxy regrouting.',
    popular: false,
    sortOrder: 13,
    subcategories: [
      'Tile Installation',
      'Tile Repair',
      'Marble Installation',
      'Granite Work',
      'Floor Polishing',
      'Grouting and Regrouting'
    ]
  },
  {
    name: 'Waterproofing & Roofing',
    slug: 'waterproofing-roofing',
    icon: 'Shield',
    filterGroup: 'home-maintenance',
    description: 'Terrace membrane waterproofing, bathroom seepage chemical fixes and roof leakage sealing.',
    popular: false,
    sortOrder: 14,
    subcategories: [
      'Terrace Waterproofing',
      'Roof Leakage Repair',
      'Bathroom Waterproofing',
      'Wall Seepage Repair',
      'Roof Maintenance',
      'Crack Sealing'
    ]
  },
  {
    name: 'Gardening & Landscaping',
    slug: 'gardening-landscaping',
    icon: 'Sprout',
    filterGroup: 'home-maintenance',
    description: 'Lawn care, balcony green setups, plant nutrition, organic pruning and tree trimming.',
    popular: false,
    sortOrder: 15,
    subcategories: [
      'Gardener',
      'Lawn Maintenance',
      'Plant Care',
      'Tree Trimming',
      'Balcony Gardening',
      'Landscape Installation'
    ]
  },
  {
    name: 'Laundry & Dry Cleaning',
    slug: 'laundry-dry-cleaning',
    icon: 'Shirt',
    filterGroup: 'cleaning',
    description: 'Doorstep laundry, steam ironing, premium suit dry cleaning, quilts and curtain care.',
    popular: false,
    sortOrder: 16,
    subcategories: [
      'Laundry',
      'Ironing',
      'Dry Cleaning',
      'Curtain Cleaning',
      'Blanket and Quilt Cleaning',
      'Wash and Fold'
    ]
  },
  {
    name: 'Beauty & Salon at Home',
    slug: 'beauty-salon',
    icon: 'Scissors',
    filterGroup: 'personal-services',
    description: 'At-home grooming, haircutting, facial skincare, bridal makeup and relaxing spa therapy.',
    popular: true,
    sortOrder: 17,
    subcategories: [
      'Haircut and Grooming',
      'Makeup Artist',
      'Facial and Skincare',
      'Hair Styling',
      'Bridal Makeup',
      'Beauty Services at Home'
    ]
  },
  {
    name: 'Computer & Laptop Repair',
    slug: 'computer-laptop-repair',
    icon: 'Laptop',
    filterGroup: 'repair-installation',
    description: 'Hardware screen fix, motherboard repairs, SSD upgrades, OS setups and data recovery.',
    popular: false,
    sortOrder: 18,
    subcategories: [
      'Laptop Repair',
      'Desktop Repair',
      'Hardware Replacement',
      'Software Troubleshooting',
      'Operating System Installation',
      'Data Recovery'
    ]
  },
  {
    name: 'CCTV & Security Systems',
    slug: 'cctv-security',
    icon: 'Camera',
    filterGroup: 'repair-installation',
    description: 'HD surveillance camera installation, DVR/NVR configuration, alarms and video door phones.',
    popular: false,
    sortOrder: 19,
    subcategories: [
      'CCTV Installation',
      'Camera Repair',
      'DVR and NVR Setup',
      'Access Control Systems',
      'Alarm Installation',
      'Security System Maintenance'
    ]
  },
  {
    name: 'Internet & Networking',
    slug: 'internet-networking',
    icon: 'Router',
    filterGroup: 'repair-installation',
    description: 'High-speed Wi-Fi setup, mesh network extension, LAN structured cabling and router config.',
    popular: false,
    sortOrder: 20,
    subcategories: [
      'Wi-Fi Setup',
      'Router Configuration',
      'LAN Installation',
      'Network Troubleshooting',
      'Structured Cabling',
      'Network Equipment Installation'
    ]
  },
  {
    name: 'RO & Water Purifier',
    slug: 'ro-water-purifier',
    icon: 'Gauge',
    filterGroup: 'repair-installation',
    description: 'Water purifier filter replacement, RO membrane servicing, TDS calibration and pump repair.',
    popular: true,
    sortOrder: 21,
    subcategories: [
      'RO Installation',
      'Filter Replacement',
      'Water Purifier Servicing',
      'RO Repair',
      'TDS Checking',
      'Water Purifier Maintenance'
    ]
  },
  {
    name: 'Geyser & Water Heater',
    slug: 'geyser-water-heater',
    icon: 'Flame',
    filterGroup: 'repair-installation',
    description: 'Electric and gas geyser installation, element replacement, descaling and safety inspections.',
    popular: false,
    sortOrder: 22,
    subcategories: [
      'Geyser Installation',
      'Water Heater Repair',
      'Thermostat Replacement',
      'Heating Element Replacement',
      'Geyser Maintenance',
      'Safety Inspection'
    ]
  },
  {
    name: 'Solar Panel Services',
    slug: 'solar-panel-services',
    icon: 'Sun',
    filterGroup: 'repair-installation',
    description: 'Rooftop solar panel installation, inverter battery sync, panel cleaning and system audits.',
    popular: false,
    sortOrder: 23,
    subcategories: [
      'Solar Panel Installation',
      'Solar Panel Cleaning',
      'Inverter Installation',
      'Battery Maintenance',
      'Solar System Repair',
      'Solar Maintenance'
    ]
  },
  {
    name: 'Interior Design & Modular Kitchen',
    slug: 'interior-design',
    icon: 'Home',
    filterGroup: 'moving-construction',
    description: 'Custom modular kitchens, 3D space planning, modern false ceilings and wardrobe cabinetry.',
    popular: false,
    sortOrder: 24,
    subcategories: [
      'Interior Design',
      'Modular Kitchen',
      'Wardrobe Design',
      'False Ceiling',
      'TV Unit Installation',
      'Space Planning'
    ]
  },
  {
    name: 'Glass & Aluminium Work',
    slug: 'glass-aluminium',
    icon: 'PanelTop',
    filterGroup: 'home-maintenance',
    description: 'Toughened glass partitions, sliding aluminium windows, shower cubicles and glass repairs.',
    popular: false,
    sortOrder: 25,
    subcategories: [
      'Glass Installation',
      'Aluminium Doors',
      'Aluminium Windows',
      'Glass Partitions',
      'Shower Enclosures',
      'Glass Repair'
    ]
  },
  {
    name: 'Curtains, Blinds & Wallpaper',
    slug: 'curtains-blinds',
    icon: 'Maximize2',
    filterGroup: 'home-maintenance',
    description: 'Custom blackout curtains, motorized tracks, zebra blinds and luxury designer wallpapers.',
    popular: false,
    sortOrder: 26,
    subcategories: [
      'Curtain Installation',
      'Curtain Rod Fitting',
      'Roller Blinds',
      'Zebra Blinds',
      'Wallpaper Installation',
      'Curtain Track Repair'
    ]
  },
  {
    name: 'Home Installation & Assembly',
    slug: 'home-installation',
    icon: 'CheckSquare',
    filterGroup: 'repair-installation',
    description: 'TV wall mounting, mirror hanging, flatpack furniture assembly and fixture installations.',
    popular: false,
    sortOrder: 27,
    subcategories: [
      'TV Wall Mounting',
      'Mirror Installation',
      'Wall Fixtures',
      'Furniture Assembly',
      'Ceiling Fan Installation',
      'Household Fixture Installation'
    ]
  },
  {
    name: 'Driving & Transportation',
    slug: 'driving-transportation',
    icon: 'CarFront',
    filterGroup: 'vehicle-services',
    description: 'On-demand verified hourly drivers, airport transfers, outstation chauffeurs and vehicle drop.',
    popular: false,
    sortOrder: 28,
    subcategories: [
      'Personal Driver',
      'Hourly Driver',
      'Outstation Driver',
      'Pickup and Drop',
      'Vehicle Transportation',
      'Scheduled Local Transport'
    ]
  },
  {
    name: 'Event & Photography Services',
    slug: 'event-photography',
    icon: 'Video',
    filterGroup: 'personal-services',
    description: 'Wedding photography, video cinematography, event decor setups and professional lighting.',
    popular: false,
    sortOrder: 29,
    subcategories: [
      'Event Photography',
      'Wedding Photography',
      'Videography',
      'Event Decoration',
      'Birthday Event Setup',
      'Event Equipment Assistance'
    ]
  },
  {
    name: 'Other Local Services',
    slug: 'other-services',
    icon: 'Wrench',
    filterGroup: 'other-services',
    description: 'Handyman odd jobs, pressure washing, gutter clearance and general property maintenance.',
    popular: false,
    sortOrder: 30,
    subcategories: [
      'Handyman',
      'General Household Repairs',
      'Pressure Washing',
      'Gutter Cleaning',
      'Miscellaneous Home Assistance',
      'Other Approved Local Services'
    ]
  }
];

export async function runMigration() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const categoriesColl = db.collection('servicecategories');

  console.log('--- Step 1: Upserting 30 Canonical Domains ---');
  const canonicalMap = {}; // slug -> doc
  for (const domain of CANONICAL_DOMAINS) {
    const updated = await categoriesColl.findOneAndUpdate(
      { slug: domain.slug },
      {
        $set: {
          name: domain.name,
          slug: domain.slug,
          icon: domain.icon,
          description: domain.description,
          subcategories: domain.subcategories,
          filterGroup: domain.filterGroup,
          popular: domain.popular,
          sortOrder: domain.sortOrder,
          isActive: true
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    canonicalMap[domain.slug] = updated;
    console.log(`Synced canonical: ${domain.name} (${domain.slug})`);
  }

  console.log('\n--- Step 2: Reconciling Legacy Duplicate Categories ---');
  const legacyToCanonicalMapping = {
    'electrician': 'electrical-services',
    'plumber': 'plumbing-services',
    'ac-repair': 'ac-hvac-services',
    'carpenter': 'carpentry-furniture',
    'painting': 'painting-services',
    'locksmith': 'locksmith-services',
    'vehicle-services': 'vehicle-repair'
  };

  for (const [legacySlug, canonicalSlug] of Object.entries(legacyToCanonicalMapping)) {
    const legacyDoc = await categoriesColl.findOne({ slug: legacySlug });
    const canonicalDoc = canonicalMap[canonicalSlug] || (await categoriesColl.findOne({ slug: canonicalSlug }));

    if (legacyDoc && canonicalDoc && String(legacyDoc._id) !== String(canonicalDoc._id)) {
      console.log(`Migrating references from legacy "${legacyDoc.name}" (${legacyDoc.slug} / ${legacyDoc._id}) -> "${canonicalDoc.name}" (${canonicalDoc.slug} / ${canonicalDoc._id})...`);

      // 1. Migrate Jobs
      const jobsRes = await db.collection('jobs').updateMany(
        { category: legacyDoc._id },
        { $set: { category: canonicalDoc._id } }
      );
      console.log(`  Updated ${jobsRes.modifiedCount} jobs`);

      // 2. Migrate Service Listings
      const listingsRes = await db.collection('servicelistings').updateMany(
        { category: legacyDoc._id },
        { $set: { category: canonicalDoc._id } }
      );
      console.log(`  Updated ${listingsRes.modifiedCount} service listings`);

      // 3. Migrate Vendor Profiles (primaryCategory and categories array)
      const vpPrimary = await db.collection('vendorprofiles').updateMany(
        { primaryCategory: legacyDoc._id },
        { $set: { primaryCategory: canonicalDoc._id } }
      );
      // Replace in categories array
      const vpArray = await db.collection('vendorprofiles').updateMany(
        { categories: legacyDoc._id },
        { 
          $pull: { categories: legacyDoc._id }
        }
      );
      const vpAdd = await db.collection('vendorprofiles').updateMany(
        { _id: { $in: (await db.collection('vendorprofiles').find({ primaryCategory: canonicalDoc._id }).toArray()).map(v => v._id) } },
        { $addToSet: { categories: canonicalDoc._id } }
      );
      console.log(`  Updated vendor profiles: ${vpPrimary.modifiedCount} primary, ${vpArray.modifiedCount} categories array`);

      // 4. Migrate Bookings
      const bookRes = await db.collection('bookings').updateMany(
        { category: legacyDoc._id },
        { $set: { category: canonicalDoc._id } }
      );
      console.log(`  Updated ${bookRes.modifiedCount} bookings`);

      // 5. Migrate Job Requests
      const reqRes = await db.collection('jobrequests').updateMany(
        { category: legacyDoc._id },
        { $set: { category: canonicalDoc._id } }
      );
      console.log(`  Updated ${reqRes.modifiedCount} job requests`);

      // 6. Delete or mark inactive legacy category safely
      await categoriesColl.deleteOne({ _id: legacyDoc._id });
      console.log(`  Cleaned up legacy duplicate category: ${legacyDoc.slug}`);
    }
  }

  console.log('\n--- Step 3: Verification of Active Categories ---');
  const activeCount = await categoriesColl.countDocuments({ isActive: true });
  console.log(`Active canonical categories in DB: ${activeCount}`);

  const activeCategories = await categoriesColl.find({ isActive: true }).sort({ sortOrder: 1 }).toArray();
  activeCategories.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name} [${c.slug}] - ${c.subcategories?.length || 0} subcategories`);
  });

  await mongoose.disconnect();
  console.log('Migration completed successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('migrate_categories.js')) {
  runMigration().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
