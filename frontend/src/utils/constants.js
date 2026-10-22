export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export const USER_ROLES = {
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  ADMIN: 'admin'
};

export const JOB_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const JOB_URGENCY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EMERGENCY: 'emergency'
};

export const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Services' },
  { id: 'home-maintenance', label: 'Home Maintenance' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'repair-installation', label: 'Repair & Installation' },
  { id: 'vehicle-services', label: 'Vehicle Services' },
  { id: 'personal-services', label: 'Personal Services' },
  { id: 'moving-construction', label: 'Moving & Construction' },
  { id: 'other-services', label: 'Other Services' }
];

export { 
  CATEGORY_MEDIA, 
  CATEGORY_IMAGES,
  SUBSERVICE_IMAGES,
  getCategoryMedia, 
  getCategoryImage,
  getSubServiceImage,
  getServiceImage,
  FALLBACK_CATEGORY_IMAGE, 
  handleImageFallback 
} from './categoryMedia';

export const CATEGORIES_LIST = [
  {
    "id": "electrical-services",
    "name": "Electrical Services",
    "slug": "electrical-services",
    "icon": "Zap",
    "filterGroup": "home-maintenance",
    "description": "Certified electricians for wiring, panel upgrades, switchboards, lighting and fault diagnosis.",
    "subcategories": [
      "Electrician",
      "Wiring and Rewiring",
      "Switchboard Repair",
      "Fan and Light Installation",
      "Inverter and Electrical Backup",
      "Electrical Fault Diagnosis"
    ],
    "image": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
    "alt": "Electrician repairing a switchboard or electrical wiring"
  },
  {
    "id": "plumbing-services",
    "name": "Plumbing Services",
    "slug": "plumbing-services",
    "icon": "Droplets",
    "filterGroup": "home-maintenance",
    "description": "Expert plumbers for pipe leakage, tap fittings, drainage, water tanks and bathroom repairs.",
    "subcategories": [
      "Plumber",
      "Pipe Leakage Repair",
      "Tap and Faucet Repair",
      "Bathroom Fittings",
      "Drainage and Blockage",
      "Water Tank Services"
    ],
    "image": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80",
    "alt": "Plumber fixing a water pipe or tap"
  },
  {
    "id": "ac-hvac-services",
    "name": "AC & HVAC Services",
    "slug": "ac-hvac-services",
    "icon": "Wind",
    "filterGroup": "repair-installation",
    "description": "Complete air conditioning servicing, installation, gas charging and HVAC maintenance.",
    "subcategories": [
      "AC Repair",
      "AC Installation",
      "AC Servicing",
      "Gas Charging",
      "Compressor Repair",
      "Commercial HVAC Maintenance"
    ],
    "image": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician repairing an air conditioner"
  },
  {
    "id": "appliance-repair",
    "name": "Appliance Repair",
    "slug": "appliance-repair",
    "icon": "Cpu",
    "filterGroup": "repair-installation",
    "description": "Diagnostics and repairs for refrigerators, washing machines, microwaves and home appliances.",
    "subcategories": [
      "Refrigerator Repair",
      "Washing Machine Repair",
      "Microwave Repair",
      "Cooler Repair",
      "Dishwasher Repair",
      "Small Appliance Repair"
    ],
    "image": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician repairing a washing machine or refrigerator"
  },
  {
    "id": "carpentry-furniture",
    "name": "Carpentry & Furniture",
    "slug": "carpentry-furniture",
    "icon": "Hammer",
    "filterGroup": "home-maintenance",
    "description": "Skilled carpenters for custom woodwork, furniture repair, door fittings and cabinet assembly.",
    "subcategories": [
      "Carpenter",
      "Furniture Repair",
      "Door and Window Repair",
      "Furniture Assembly",
      "Cabinet Installation",
      "Custom Woodwork"
    ],
    "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
    "alt": "Carpenter working on wooden furniture"
  },
  {
    "id": "home-cleaning",
    "name": "Home Cleaning",
    "slug": "home-cleaning",
    "icon": "Sparkles",
    "filterGroup": "cleaning",
    "description": "Comprehensive deep cleaning for homes, kitchens, bathrooms, sofas and post-renovation spaces.",
    "subcategories": [
      "Home Deep Cleaning",
      "Bathroom Cleaning",
      "Kitchen Cleaning",
      "Sofa and Upholstery Cleaning",
      "Move-in and Move-out Cleaning",
      "Post-construction Cleaning"
    ],
    "image": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional cleaning a home"
  },
  {
    "id": "painting-services",
    "name": "Painting Services",
    "slug": "painting-services",
    "icon": "Paintbrush",
    "filterGroup": "home-maintenance",
    "description": "Interior and exterior painting, wall putty preparation, texture finishes and wallpapering.",
    "subcategories": [
      "Interior Painting",
      "Exterior Painting",
      "Wall Preparation",
      "Wallpaper Application",
      "Texture Painting",
      "Touch-up and Repainting"
    ],
    "image": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
    "alt": "Painter painting a wall"
  },
  {
    "id": "pest-control",
    "name": "Pest Control",
    "slug": "pest-control",
    "icon": "Bug",
    "filterGroup": "cleaning",
    "description": "Targeted treatments for termites, cockroaches, mosquitoes, rodents and residential pests.",
    "subcategories": [
      "Cockroach Control",
      "Termite Treatment",
      "Mosquito Control",
      "Rodent Control",
      "Ant Control",
      "General Pest Management"
    ],
    "image": "https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=600&q=80",
    "alt": "Pest control professional spraying a room"
  },
  {
    "id": "locksmith-services",
    "name": "Locksmith Services",
    "slug": "locksmith-services",
    "icon": "KeyRound",
    "filterGroup": "repair-installation",
    "description": "Emergency lockout rescue, smart digital lock installation, key duplication and lock repairs.",
    "subcategories": [
      "Lock Repair",
      "Lock Replacement",
      "Key Duplication",
      "Smart Lock Installation",
      "Door Lockout Assistance",
      "Commercial Lock Services"
    ],
    "image": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
    "alt": "Locksmith repairing a door lock"
  },
  {
    "id": "vehicle-repair",
    "name": "Vehicle Repair & Maintenance",
    "slug": "vehicle-repair",
    "icon": "Car",
    "filterGroup": "vehicle-services",
    "description": "On-demand car and bike servicing, mobile battery replacement, puncture fix and roadside aid.",
    "subcategories": [
      "Car Repair",
      "Bike Repair",
      "Vehicle Servicing",
      "Battery Assistance",
      "Puncture Repair",
      "Roadside Assistance"
    ],
    "image": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80",
    "alt": "Mechanic repairing a vehicle"
  },
  {
    "id": "packers-movers",
    "name": "Home Shifting & Packers",
    "slug": "packers-movers",
    "icon": "Truck",
    "filterGroup": "moving-construction",
    "description": "Reliable packing, loading, household shifting, furniture transit and office relocation.",
    "subcategories": [
      "Household Shifting",
      "Office Relocation",
      "Packing and Unpacking",
      "Loading and Unloading",
      "Furniture Transportation",
      "Local Moving Assistance"
    ],
    "image": "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=600&q=80",
    "alt": "Movers packing household items"
  },
  {
    "id": "construction-masonry",
    "name": "Construction & Masonry",
    "slug": "construction-masonry",
    "icon": "HardHat",
    "filterGroup": "moving-construction",
    "description": "Brickwork, structural plastering, concrete casting, partition demolition and masonry repairs.",
    "subcategories": [
      "Masonry",
      "Brickwork",
      "Plastering",
      "Concrete Work",
      "Wall Demolition",
      "Minor Structural Repairs"
    ],
    "image": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    "alt": "Mason working on a brick wall"
  },
  {
    "id": "tile-flooring",
    "name": "Tile & Flooring",
    "slug": "tile-flooring",
    "icon": "Layers",
    "filterGroup": "moving-construction",
    "description": "Vitrified tile laying, marble diamond polishing, granite countertops and epoxy regrouting.",
    "subcategories": [
      "Tile Installation",
      "Tile Repair",
      "Marble Installation",
      "Granite Work",
      "Floor Polishing",
      "Grouting and Regrouting"
    ],
    "image": "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional installing floor tiles"
  },
  {
    "id": "waterproofing-roofing",
    "name": "Waterproofing & Roofing",
    "slug": "waterproofing-roofing",
    "icon": "Shield",
    "filterGroup": "home-maintenance",
    "description": "Terrace membrane waterproofing, bathroom seepage chemical fixes and roof leakage sealing.",
    "subcategories": [
      "Terrace Waterproofing",
      "Roof Leakage Repair",
      "Bathroom Waterproofing",
      "Wall Seepage Repair",
      "Roof Maintenance",
      "Crack Sealing"
    ],
    "image": "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=600&q=80",
    "alt": "Worker repairing a rooftop"
  },
  {
    "id": "gardening-landscaping",
    "name": "Gardening & Landscaping",
    "slug": "gardening-landscaping",
    "icon": "Sprout",
    "filterGroup": "home-maintenance",
    "description": "Lawn care, balcony green setups, plant nutrition, organic pruning and tree trimming.",
    "subcategories": [
      "Gardener",
      "Lawn Maintenance",
      "Plant Care",
      "Tree Trimming",
      "Balcony Gardening",
      "Landscape Installation"
    ],
    "image": "https://images.unsplash.com/photo-1557429287-b2e26467fc2b?auto=format&fit=crop&w=600&q=80",
    "alt": "Gardener maintaining a garden"
  },
  {
    "id": "laundry-dry-cleaning",
    "name": "Laundry & Dry Cleaning",
    "slug": "laundry-dry-cleaning",
    "icon": "Shirt",
    "filterGroup": "cleaning",
    "description": "Doorstep laundry, steam ironing, premium suit dry cleaning, quilts and curtain care.",
    "subcategories": [
      "Laundry",
      "Ironing",
      "Dry Cleaning",
      "Curtain Cleaning",
      "Blanket and Quilt Cleaning",
      "Wash and Fold"
    ],
    "image": "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80",
    "alt": "Clothes being professionally cleaned"
  },
  {
    "id": "beauty-salon",
    "name": "Beauty & Salon at Home",
    "slug": "beauty-salon",
    "icon": "Scissors",
    "filterGroup": "personal-services",
    "description": "At-home grooming, haircutting, facial skincare, bridal makeup and relaxing spa therapy.",
    "subcategories": [
      "Haircut and Grooming",
      "Makeup Artist",
      "Facial and Skincare",
      "Hair Styling",
      "Bridal Makeup",
      "Beauty Services at Home"
    ],
    "image": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional providing a salon service"
  },
  {
    "id": "computer-laptop-repair",
    "name": "Computer & Laptop Repair",
    "slug": "computer-laptop-repair",
    "icon": "Laptop",
    "filterGroup": "repair-installation",
    "description": "Hardware screen fix, motherboard repairs, SSD upgrades, OS setups and data recovery.",
    "subcategories": [
      "Laptop Repair",
      "Desktop Repair",
      "Hardware Replacement",
      "Software Troubleshooting",
      "Operating System Installation",
      "Data Recovery"
    ],
    "image": "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician repairing a laptop"
  },
  {
    "id": "cctv-security",
    "name": "CCTV & Security Systems",
    "slug": "cctv-security",
    "icon": "Camera",
    "filterGroup": "repair-installation",
    "description": "HD surveillance camera installation, DVR/NVR configuration, alarms and video door phones.",
    "subcategories": [
      "CCTV Installation",
      "Camera Repair",
      "DVR and NVR Setup",
      "Access Control Systems",
      "Alarm Installation",
      "Security System Maintenance"
    ],
    "image": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician installing a security camera"
  },
  {
    "id": "internet-networking",
    "name": "Internet & Networking",
    "slug": "internet-networking",
    "icon": "Router",
    "filterGroup": "repair-installation",
    "description": "High-speed Wi-Fi setup, mesh network extension, LAN structured cabling and router config.",
    "subcategories": [
      "Wi-Fi Setup",
      "Router Configuration",
      "LAN Installation",
      "Network Troubleshooting",
      "Structured Cabling",
      "Network Equipment Installation"
    ],
    "image": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician installing a router or network cable"
  },
  {
    "id": "ro-water-purifier",
    "name": "RO & Water Purifier",
    "slug": "ro-water-purifier",
    "icon": "Gauge",
    "filterGroup": "repair-installation",
    "description": "Water purifier filter replacement, RO membrane servicing, TDS calibration and pump repair.",
    "subcategories": [
      "RO Installation",
      "Filter Replacement",
      "Water Purifier Servicing",
      "RO Repair",
      "TDS Checking",
      "Water Purifier Maintenance"
    ],
    "image": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician servicing a water purifier"
  },
  {
    "id": "geyser-water-heater",
    "name": "Geyser & Water Heater",
    "slug": "geyser-water-heater",
    "icon": "Flame",
    "filterGroup": "repair-installation",
    "description": "Electric and gas geyser installation, element replacement, descaling and safety inspections.",
    "subcategories": [
      "Geyser Installation",
      "Water Heater Repair",
      "Thermostat Replacement",
      "Heating Element Replacement",
      "Geyser Maintenance",
      "Safety Inspection"
    ],
    "image": "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician repairing a water heater"
  },
  {
    "id": "solar-panel-services",
    "name": "Solar Panel Services",
    "slug": "solar-panel-services",
    "icon": "Sun",
    "filterGroup": "repair-installation",
    "description": "Rooftop solar panel installation, inverter battery sync, panel cleaning and system audits.",
    "subcategories": [
      "Solar Panel Installation",
      "Solar Panel Cleaning",
      "Inverter Installation",
      "Battery Maintenance",
      "Solar System Repair",
      "Solar Maintenance"
    ],
    "image": "https://images.unsplash.com/photo-1545208942-e1c9c916524b?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional installing solar panels"
  },
  {
    "id": "interior-design",
    "name": "Interior Design & Modular Kitchen",
    "slug": "interior-design",
    "icon": "Home",
    "filterGroup": "moving-construction",
    "description": "Custom modular kitchens, 3D space planning, modern false ceilings and wardrobe cabinetry.",
    "subcategories": [
      "Interior Design",
      "Modular Kitchen",
      "Wardrobe Design",
      "False Ceiling",
      "TV Unit Installation",
      "Space Planning"
    ],
    "image": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
    "alt": "Modern kitchen installation"
  },
  {
    "id": "glass-aluminium",
    "name": "Glass & Aluminium Work",
    "slug": "glass-aluminium",
    "icon": "PanelTop",
    "filterGroup": "home-maintenance",
    "description": "Toughened glass partitions, sliding aluminium windows, shower cubicles and glass repairs.",
    "subcategories": [
      "Glass Installation",
      "Aluminium Doors",
      "Aluminium Windows",
      "Glass Partitions",
      "Shower Enclosures",
      "Glass Repair"
    ],
    "image": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80",
    "alt": "Worker installing glass panels"
  },
  {
    "id": "curtains-blinds",
    "name": "Curtains, Blinds & Wallpaper",
    "slug": "curtains-blinds",
    "icon": "Maximize2",
    "filterGroup": "home-maintenance",
    "description": "Custom blackout curtains, motorized tracks, zebra blinds and luxury designer wallpapers.",
    "subcategories": [
      "Curtain Installation",
      "Curtain Rod Fitting",
      "Roller Blinds",
      "Zebra Blinds",
      "Wallpaper Installation",
      "Curtain Track Repair"
    ],
    "image": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional fitting curtains or wallpaper"
  },
  {
    "id": "home-installation",
    "name": "Home Installation & Assembly",
    "slug": "home-installation",
    "icon": "CheckSquare",
    "filterGroup": "repair-installation",
    "description": "TV wall mounting, mirror hanging, flatpack furniture assembly and fixture installations.",
    "subcategories": [
      "TV Wall Mounting",
      "Mirror Installation",
      "Wall Fixtures",
      "Furniture Assembly",
      "Ceiling Fan Installation",
      "Household Fixture Installation"
    ],
    "image": "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80",
    "alt": "Technician assembling household equipment"
  },
  {
    "id": "driving-transportation",
    "name": "Driving & Transportation",
    "slug": "driving-transportation",
    "icon": "CarFront",
    "filterGroup": "vehicle-services",
    "description": "On-demand verified hourly drivers, airport transfers, outstation chauffeurs and vehicle drop.",
    "subcategories": [
      "Personal Driver",
      "Hourly Driver",
      "Outstation Driver",
      "Pickup and Drop",
      "Vehicle Transportation",
      "Scheduled Local Transport"
    ],
    "image": "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional driver or transport service"
  },
  {
    "id": "event-photography",
    "name": "Event & Photography Services",
    "slug": "event-photography",
    "icon": "Video",
    "filterGroup": "personal-services",
    "description": "Wedding photography, video cinematography, event decor setups and professional lighting.",
    "subcategories": [
      "Event Photography",
      "Wedding Photography",
      "Videography",
      "Event Decoration",
      "Birthday Event Setup",
      "Event Equipment Assistance"
    ],
    "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
    "alt": "Photographer at an event"
  },
  {
    "id": "other-services",
    "name": "Other Local Services",
    "slug": "other-services",
    "icon": "Wrench",
    "filterGroup": "other-services",
    "description": "Handyman odd jobs, pressure washing, gutter clearance and general property maintenance.",
    "subcategories": [
      "Handyman",
      "General Household Repairs",
      "Pressure Washing",
      "Gutter Cleaning",
      "Miscellaneous Home Assistance",
      "Other Approved Local Services"
    ],
    "image": "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=600&q=80",
    "alt": "Professional handyman performing a general repair"
  }
];
