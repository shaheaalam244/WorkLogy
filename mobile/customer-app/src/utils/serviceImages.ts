export const SERVICE_IMAGES: Record<string, any> = {
  'electrical-services': require('../assets/services/Electrician Repairing Home Electrical Panel.png'),
  'plumbing-services': require('../assets/services/Plumber Repairing Under Kitchen Sink.png'),
  'ac-hvac-services': require('../assets/services/Air Conditioner Maintenance in a Modern Home.png'),
  'appliance-repair': require('../assets/services/Appliance Repair Workshop Scene.png'),
  'carpentry-furniture': require('../assets/services/Skilled Handyman Repairing a Wooden Cabinet.png'),
  'home-cleaning': require('../assets/services/Professional Cleaning in a Bright Living Room.png'),
  'painting-services': require('../assets/services/Apartment Wall Painting in Progress.png'),
  'pest-control': require('../assets/services/Kitchen Pest Control Inspection.png'),
  'locksmith-services': require('../assets/services/Indian Locksmith Repairing Door Lock.png'),
  'vehicle-repair': require('../assets/services/Focused Mechanic Repairing Car Engine.png'),
  'packers-movers': require('../assets/services/Professional Movers Packing a Modern Apartment.png'),
  'construction-masonry': require('../assets/services/Bricklayer Building Under Sunlight.png'),
  'tile-flooring': require('../assets/services/Tiling a Bright Modern Interior.png'),
  'waterproofing-roofing': require('../assets/services/Rooftop Waterproofing Worker in Action.png'),
  'gardening-landscaping': require('../assets/services/Gardener Trimming a Sunny Garden Hedge.png'),
  'laundry-dry-cleaning': require('../assets/services/Professional Laundry Folding Workspace.png'),
  'beauty-salon': require('../assets/services/Home Haircut in a Cosy Living Room.png'),
  'computer-laptop-repair': require('../assets/services/Laptop Repair Workshop Focus.png'),
  'cctv-security': require('../assets/services/Technician Installing Porch Security Camera.png'),
  'internet-networking': require('../assets/services/Home Network Installation Technician.png'),
  'ro-water-purifier': require('../assets/services/Water Purifier Technician at Work.png'),
  'geyser-water-heater': require('../assets/services/Technician Repairing Bathroom Water Heater.png'),
  'solar-panel-services': require('../assets/services/Rooftop Solar Panel Inspection.png'),
  'interior-design': require('../assets/services/Modern Kitchen Consultation.png'),
  'glass-aluminium': require('../assets/services/Installing a Balcony Glass Door.png'),
  'curtains-blinds': require('../assets/services/Installing Curtains in a Bright Modern Room.png'),
  'home-installation': require('../assets/services/TV Installation with Spirit Level.png'),
  'driving-transportation': require('../assets/services/Professional Chauffeur Welcoming Passenger.png'),
  'event-photography': require('../assets/services/Wedding Videographer Capturing Festive Moments.png'),
  'other-services': require('../assets/services/Homepage.png')
};

// Aliases for friendly matching by name keywords or shortened slugs
const ALIAS_MAP: Record<string, string> = {
  electrician: 'electrical-services',
  electrical: 'electrical-services',
  plumber: 'plumbing-services',
  plumbing: 'plumbing-services',
  'ac-repair': 'ac-hvac-services',
  ac: 'ac-hvac-services',
  hvac: 'ac-hvac-services',
  appliance: 'appliance-repair',
  appliances: 'appliance-repair',
  carpenter: 'carpentry-furniture',
  carpentry: 'carpentry-furniture',
  furniture: 'carpentry-furniture',
  cleaning: 'home-cleaning',
  painting: 'painting-services',
  painter: 'painting-services',
  pest: 'pest-control',
  locksmith: 'locksmith-services',
  lock: 'locksmith-services',
  mechanic: 'vehicle-repair',
  vehicle: 'vehicle-repair',
  car: 'vehicle-repair',
  movers: 'packers-movers',
  shifting: 'packers-movers',
  masonry: 'construction-masonry',
  mason: 'construction-masonry',
  construction: 'construction-masonry',
  flooring: 'tile-flooring',
  tile: 'tile-flooring',
  waterproofing: 'waterproofing-roofing',
  roofing: 'waterproofing-roofing',
  gardener: 'gardening-landscaping',
  gardening: 'gardening-landscaping',
  laundry: 'laundry-dry-cleaning',
  dryclean: 'laundry-dry-cleaning',
  salon: 'beauty-salon',
  beauty: 'beauty-salon',
  computer: 'computer-laptop-repair',
  laptop: 'computer-laptop-repair',
  cctv: 'cctv-security',
  security: 'cctv-security',
  internet: 'internet-networking',
  wifi: 'internet-networking',
  network: 'internet-networking',
  ro: 'ro-water-purifier',
  purifier: 'ro-water-purifier',
  geyser: 'geyser-water-heater',
  heater: 'geyser-water-heater',
  solar: 'solar-panel-services',
  interior: 'interior-design',
  kitchen: 'interior-design',
  glass: 'glass-aluminium',
  aluminium: 'glass-aluminium',
  curtains: 'curtains-blinds',
  blinds: 'curtains-blinds',
  installation: 'home-installation',
  tv: 'home-installation',
  driver: 'driving-transportation',
  driving: 'driving-transportation',
  photography: 'event-photography',
  photo: 'event-photography',
  event: 'event-photography'
};

export function getServiceImage(slugOrName?: string): any {
  if (!slugOrName) return SERVICE_IMAGES['other-services'];

  const normalized = slugOrName.toLowerCase().trim().replace(/\s+/g, '-');

  // Direct match
  if (SERVICE_IMAGES[normalized]) {
    return SERVICE_IMAGES[normalized];
  }

  // Alias lookup
  for (const [key, target] of Object.entries(ALIAS_MAP)) {
    if (normalized.includes(key)) {
      return SERVICE_IMAGES[target];
    }
  }

  return SERVICE_IMAGES['other-services'];
}
