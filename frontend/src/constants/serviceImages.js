/**
 * WorkLogy — Central Service Images & Asset Mapping Module
 * (c) WorkLogy Hyperlocal Marketplace
 *
 * This module connects all 30 canonical service categories and 180 sub-services
 * to authentic high-resolution local assets stored in `src/assets`.
 */

// ── 1. EXPLICIT LOCAL ASSET IMPORTS (30 Category PNGs + Brand Logo) ──
import logoSvg from '../assets/logo.svg';
import acHvacImg from '../assets/Air Conditioner Maintenance in a Modern Home.png';
import paintingImg from '../assets/Apartment Wall Painting in Progress.png';
import applianceImg from '../assets/Appliance Repair Workshop Scene.png';
import constructionImg from '../assets/Bricklayer Building Under Sunlight.png';
import electricalImg from '../assets/Electrician Repairing Home Electrical Panel.png';
import vehicleImg from '../assets/Focused Mechanic Repairing Car Engine.png';
import gardeningImg from '../assets/Gardener Trimming a Sunny Garden Hedge.png';
import otherServicesImg from '../assets/Handyman Repairing a Home Door Lock.png';
import beautySalonImg from '../assets/Home Haircut in a Cosy Living Room.png';
import internetNetworkingImg from '../assets/Home Network Installation Technician.png';
import locksmithImg from '../assets/Indian Locksmith Repairing Door Lock.png';
import curtainsBlindsImg from '../assets/Installing Curtains in a Bright Modern Room.png';
import glassAluminiumImg from '../assets/Installing a Balcony Glass Door.png';
import pestControlImg from '../assets/Kitchen Pest Control Inspection.png';
import computerRepairImg from '../assets/Laptop Repair Workshop Focus.png';
import interiorDesignImg from '../assets/Modern Kitchen Consultation.png';
import plumbingImg from '../assets/Plumber Repairing Under Kitchen Sink.png';
import drivingTransportImg from '../assets/Professional Chauffeur Welcoming Passenger.png';
import cleaningImg from '../assets/Professional Cleaning in a Bright Living Room.png';
import laundryImg from '../assets/Professional Laundry Folding Workspace.png';
import packersImg from '../assets/Professional Movers Packing a Modern Apartment.png';
import solarPanelImg from '../assets/Rooftop Solar Panel Inspection.png';
import waterproofingImg from '../assets/Rooftop Waterproofing Worker in Action.png';
import carpentryImg from '../assets/Skilled Handyman Repairing a Wooden Cabinet.png';
import homeInstallationImg from '../assets/TV Installation with Spirit Level.png';
import cctvSecurityImg from '../assets/Technician Installing Porch Security Camera.png';
import geyserHeaterImg from '../assets/Technician Repairing Bathroom Water Heater.png';
import tileFlooringImg from '../assets/Tiling a Bright Modern Interior.png';
import roWaterImg from '../assets/Water Purifier Technician at Work.png';
import eventPhotographyImg from '../assets/Wedding Videographer Capturing Festive Moments.png';

export const BRAND_LOGO = logoSvg;
export const FALLBACK_SERVICE_IMAGE = otherServicesImg;

/**
 * Normalizes any category, service name, or slug into a sanitized identifier.
 */
export function normalizeServiceSlug(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── 2. CANONICAL CATEGORY IMAGE MAPPING (30 Categories) ──
export const CATEGORY_IMAGES = {
  'ac-hvac-services': {
    slug: 'ac-hvac-services',
    name: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'Technician performing air conditioner servicing and maintenance in modern home',
    assetFile: 'Air Conditioner Maintenance in a Modern Home.png'
  },
  'painting-services': {
    slug: 'painting-services',
    name: 'Painting Services',
    image: paintingImg,
    alt: 'Painter applying smooth fresh paint to apartment interior walls',
    assetFile: 'Apartment Wall Painting in Progress.png'
  },
  'appliance-repair': {
    slug: 'appliance-repair',
    name: 'Appliance Repair',
    image: applianceImg,
    alt: 'Technician repairing household washing machine and refrigerator appliances',
    assetFile: 'Appliance Repair Workshop Scene.png'
  },
  'construction-masonry': {
    slug: 'construction-masonry',
    name: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Construction mason laying brickwork with mortar on a sunny job site',
    assetFile: 'Bricklayer Building Under Sunlight.png'
  },
  'electrical-services': {
    slug: 'electrical-services',
    name: 'Electrical Services',
    image: electricalImg,
    alt: 'Electrician repairing home electrical switchboard and circuit panel',
    assetFile: 'Electrician Repairing Home Electrical Panel.png'
  },
  'vehicle-repair': {
    slug: 'vehicle-repair',
    name: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Automotive mechanic repairing vehicle engine in garage workshop',
    assetFile: 'Focused Mechanic Repairing Car Engine.png'
  },
  'gardening-landscaping': {
    slug: 'gardening-landscaping',
    name: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Gardener trimming shrubs and maintaining a sunny landscaped garden',
    assetFile: 'Gardener Trimming a Sunny Garden Hedge.png'
  },
  'other-services': {
    slug: 'other-services',
    name: 'Other Local Services',
    image: otherServicesImg,
    alt: 'Local handyman performing general household repairs and door lock maintenance',
    assetFile: 'Handyman Repairing a Home Door Lock.png'
  },
  'beauty-salon': {
    slug: 'beauty-salon',
    name: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Beauty and grooming professional providing hair styling in home salon',
    assetFile: 'Home Haircut in a Cosy Living Room.png'
  },
  'internet-networking': {
    slug: 'internet-networking',
    name: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'Network technician configuring Wi-Fi router and Ethernet patch cabling',
    assetFile: 'Home Network Installation Technician.png'
  },
  'locksmith-services': {
    slug: 'locksmith-services',
    name: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Locksmith repairing and fitting a residential door deadbolt lock',
    assetFile: 'Indian Locksmith Repairing Door Lock.png'
  },
  'curtains-blinds': {
    slug: 'curtains-blinds',
    name: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Decorator installing custom window curtains and blinds in modern room',
    assetFile: 'Installing Curtains in a Bright Modern Room.png'
  },
  'glass-aluminium': {
    slug: 'glass-aluminium',
    name: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Glazier installing sliding glass door and aluminium balcony frame',
    assetFile: 'Installing a Balcony Glass Door.png'
  },
  'pest-control': {
    slug: 'pest-control',
    name: 'Pest Control',
    image: pestControlImg,
    alt: 'Pest control specialist conducting kitchen inspection and treatment',
    assetFile: 'Kitchen Pest Control Inspection.png'
  },
  'computer-laptop-repair': {
    slug: 'computer-laptop-repair',
    name: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Hardware technician repairing laptop motherboard and circuit components',
    assetFile: 'Laptop Repair Workshop Focus.png'
  },
  'interior-design': {
    slug: 'interior-design',
    name: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'Interior designer consulting on modern modular kitchen installation',
    assetFile: 'Modern Kitchen Consultation.png'
  },
  'plumbing-services': {
    slug: 'plumbing-services',
    name: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Plumber repairing pipes and water drainage under kitchen sink',
    assetFile: 'Plumber Repairing Under Kitchen Sink.png'
  },
  'driving-transportation': {
    slug: 'driving-transportation',
    name: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Professional chauffeur driver welcoming passenger to transit vehicle',
    assetFile: 'Professional Chauffeur Welcoming Passenger.png'
  },
  'home-cleaning': {
    slug: 'home-cleaning',
    name: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Professional house cleaner deep cleaning a bright modern living room',
    assetFile: 'Professional Cleaning in a Bright Living Room.png'
  },
  'laundry-dry-cleaning': {
    slug: 'laundry-dry-cleaning',
    name: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Laundry specialist pressing, folding, and cleaning fresh garments',
    assetFile: 'Professional Laundry Folding Workspace.png'
  },
  'packers-movers': {
    slug: 'packers-movers',
    name: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Professional movers packing boxes and moving household furniture',
    assetFile: 'Professional Movers Packing a Modern Apartment.png'
  },
  'solar-panel-services': {
    slug: 'solar-panel-services',
    name: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Solar technician inspecting photovoltaic solar panels on residential roof',
    assetFile: 'Rooftop Solar Panel Inspection.png'
  },
  'waterproofing-roofing': {
    slug: 'waterproofing-roofing',
    name: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Waterproofing technician applying protective seal coating on rooftop',
    assetFile: 'Rooftop Waterproofing Worker in Action.png'
  },
  'carpentry-furniture': {
    slug: 'carpentry-furniture',
    name: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Carpenter crafting and repairing wooden cabinetry and furniture',
    assetFile: 'Skilled Handyman Repairing a Wooden Cabinet.png'
  },
  'home-installation': {
    slug: 'home-installation',
    name: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'Technician mounting television on wall using spirit level for alignment',
    assetFile: 'TV Installation with Spirit Level.png'
  },
  'cctv-security': {
    slug: 'cctv-security',
    name: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'Security technician mounting outdoor CCTV surveillance camera on porch',
    assetFile: 'Technician Installing Porch Security Camera.png'
  },
  'geyser-water-heater': {
    slug: 'geyser-water-heater',
    name: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Technician inspecting and repairing bathroom geyser water heater',
    assetFile: 'Technician Repairing Bathroom Water Heater.png'
  },
  'tile-flooring': {
    slug: 'tile-flooring',
    name: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Flooring professional installing ceramic and marble tiles in interior room',
    assetFile: 'Tiling a Bright Modern Interior.png'
  },
  'ro-water-purifier': {
    slug: 'ro-water-purifier',
    name: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'Water purifier technician replacing filters and servicing RO unit',
    assetFile: 'Water Purifier Technician at Work.png'
  },
  'event-photography': {
    slug: 'event-photography',
    name: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Videographer and photographer capturing festive moments at an event',
    assetFile: 'Wedding Videographer Capturing Festive Moments.png'
  },
};

// Alias mappings for backward compatibility & search shortcuts
const CATEGORY_ALIASES = {
  'electrician': 'electrical-services',
  'electrical': 'electrical-services',
  'plumber': 'plumbing-services',
  'plumbing': 'plumbing-services',
  'ac-repair': 'ac-hvac-services',
  'ac-cooling': 'ac-hvac-services',
  'hvac': 'ac-hvac-services',
  'carpenter': 'carpentry-furniture',
  'carpentry': 'carpentry-furniture',
  'cleaning': 'home-cleaning',
  'cleaner': 'home-cleaning',
  'painter': 'painting-services',
  'painting': 'painting-services',
  'pest': 'pest-control',
  'locksmith': 'locksmith-services',
  'mechanic': 'vehicle-repair',
  'vehicle': 'vehicle-repair',
  'packers': 'packers-movers',
  'movers': 'packers-movers',
  'masonry': 'construction-masonry',
  'construction': 'construction-masonry',
  'flooring': 'tile-flooring',
  'tiling': 'tile-flooring',
  'roofing': 'waterproofing-roofing',
  'waterproofing': 'waterproofing-roofing',
  'gardener': 'gardening-landscaping',
  'gardening': 'gardening-landscaping',
  'laundry': 'laundry-dry-cleaning',
  'salon': 'beauty-salon',
  'beauty': 'beauty-salon',
  'laptop': 'computer-laptop-repair',
  'computer': 'computer-laptop-repair',
  'cctv': 'cctv-security',
  'security': 'cctv-security',
  'networking': 'internet-networking',
  'internet': 'internet-networking',
  'wifi': 'internet-networking',
  'ro': 'ro-water-purifier',
  'water-purifier': 'ro-water-purifier',
  'geyser': 'geyser-water-heater',
  'water-heater': 'geyser-water-heater',
  'solar': 'solar-panel-services',
  'interior': 'interior-design',
  'modular-kitchen': 'interior-design',
  'glass': 'glass-aluminium',
  'aluminium': 'glass-aluminium',
  'curtains': 'curtains-blinds',
  'blinds': 'curtains-blinds',
  'wallpaper': 'curtains-blinds',
  'installation': 'home-installation',
  'assembly': 'home-installation',
  'driver': 'driving-transportation',
  'driving': 'driving-transportation',
  'photography': 'event-photography',
  'photographer': 'event-photography',
  'handyman': 'other-services',
  'other': 'other-services'
};

// ── 3. CANONICAL SUB-SERVICE IMAGE MAPPING (180 Sub-services) ──
export const SUBSERVICE_IMAGES = {
  'electrical-services::electrician': {
    name: 'Electrician',
    slug: 'electrician',
    categorySlug: 'electrical-services',
    categoryName: 'Electrical Services',
    image: electricalImg,
    alt: 'Electrician — Professional Electrical Services service in Lucknow',
    isParentFallback: true
  },
  'electrical-services::wiring-and-rewiring': {
    name: 'Wiring and Rewiring',
    slug: 'wiring-and-rewiring',
    categorySlug: 'electrical-services',
    categoryName: 'Electrical Services',
    image: electricalImg,
    alt: 'Wiring and Rewiring — Professional Electrical Services service in Lucknow',
    isParentFallback: true
  },
  'electrical-services::switchboard-repair': {
    name: 'Switchboard Repair',
    slug: 'switchboard-repair',
    categorySlug: 'electrical-services',
    categoryName: 'Electrical Services',
    image: electricalImg,
    alt: 'Switchboard Repair — Professional Electrical Services service in Lucknow',
    isParentFallback: true
  },
  'electrical-services::fan-and-light-installation': {
    name: 'Fan and Light Installation',
    slug: 'fan-and-light-installation',
    categorySlug: 'electrical-services',
    categoryName: 'Electrical Services',
    image: electricalImg,
    alt: 'Fan and Light Installation — Professional Electrical Services service in Lucknow',
    isParentFallback: true
  },
  'electrical-services::inverter-and-electrical-backup': {
    name: 'Inverter and Electrical Backup',
    slug: 'inverter-and-electrical-backup',
    categorySlug: 'electrical-services',
    categoryName: 'Electrical Services',
    image: electricalImg,
    alt: 'Inverter and Electrical Backup — Professional Electrical Services service in Lucknow',
    isParentFallback: true
  },
  'electrical-services::electrical-fault-diagnosis': {
    name: 'Electrical Fault Diagnosis',
    slug: 'electrical-fault-diagnosis',
    categorySlug: 'electrical-services',
    categoryName: 'Electrical Services',
    image: electricalImg,
    alt: 'Electrical Fault Diagnosis — Professional Electrical Services service in Lucknow',
    isParentFallback: true
  },
  'plumbing-services::plumber': {
    name: 'Plumber',
    slug: 'plumber',
    categorySlug: 'plumbing-services',
    categoryName: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Plumber — Professional Plumbing Services service in Lucknow',
    isParentFallback: true
  },
  'plumbing-services::pipe-leakage-repair': {
    name: 'Pipe Leakage Repair',
    slug: 'pipe-leakage-repair',
    categorySlug: 'plumbing-services',
    categoryName: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Pipe Leakage Repair — Professional Plumbing Services service in Lucknow',
    isParentFallback: true
  },
  'plumbing-services::tap-and-faucet-repair': {
    name: 'Tap and Faucet Repair',
    slug: 'tap-and-faucet-repair',
    categorySlug: 'plumbing-services',
    categoryName: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Tap and Faucet Repair — Professional Plumbing Services service in Lucknow',
    isParentFallback: true
  },
  'plumbing-services::bathroom-fittings': {
    name: 'Bathroom Fittings',
    slug: 'bathroom-fittings',
    categorySlug: 'plumbing-services',
    categoryName: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Bathroom Fittings — Professional Plumbing Services service in Lucknow',
    isParentFallback: true
  },
  'plumbing-services::drainage-and-blockage': {
    name: 'Drainage and Blockage',
    slug: 'drainage-and-blockage',
    categorySlug: 'plumbing-services',
    categoryName: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Drainage and Blockage — Professional Plumbing Services service in Lucknow',
    isParentFallback: true
  },
  'plumbing-services::water-tank-services': {
    name: 'Water Tank Services',
    slug: 'water-tank-services',
    categorySlug: 'plumbing-services',
    categoryName: 'Plumbing Services',
    image: plumbingImg,
    alt: 'Water Tank Services — Professional Plumbing Services service in Lucknow',
    isParentFallback: true
  },
  'ac-hvac-services::ac-repair': {
    name: 'AC Repair',
    slug: 'ac-repair',
    categorySlug: 'ac-hvac-services',
    categoryName: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'AC Repair — Professional AC & HVAC Services service in Lucknow',
    isParentFallback: true
  },
  'ac-hvac-services::ac-installation': {
    name: 'AC Installation',
    slug: 'ac-installation',
    categorySlug: 'ac-hvac-services',
    categoryName: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'AC Installation — Professional AC & HVAC Services service in Lucknow',
    isParentFallback: true
  },
  'ac-hvac-services::ac-servicing': {
    name: 'AC Servicing',
    slug: 'ac-servicing',
    categorySlug: 'ac-hvac-services',
    categoryName: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'AC Servicing — Professional AC & HVAC Services service in Lucknow',
    isParentFallback: true
  },
  'ac-hvac-services::gas-charging': {
    name: 'Gas Charging',
    slug: 'gas-charging',
    categorySlug: 'ac-hvac-services',
    categoryName: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'Gas Charging — Professional AC & HVAC Services service in Lucknow',
    isParentFallback: true
  },
  'ac-hvac-services::compressor-repair': {
    name: 'Compressor Repair',
    slug: 'compressor-repair',
    categorySlug: 'ac-hvac-services',
    categoryName: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'Compressor Repair — Professional AC & HVAC Services service in Lucknow',
    isParentFallback: true
  },
  'ac-hvac-services::commercial-hvac-maintenance': {
    name: 'Commercial HVAC Maintenance',
    slug: 'commercial-hvac-maintenance',
    categorySlug: 'ac-hvac-services',
    categoryName: 'AC & HVAC Services',
    image: acHvacImg,
    alt: 'Commercial HVAC Maintenance — Professional AC & HVAC Services service in Lucknow',
    isParentFallback: true
  },
  'appliance-repair::refrigerator-repair': {
    name: 'Refrigerator Repair',
    slug: 'refrigerator-repair',
    categorySlug: 'appliance-repair',
    categoryName: 'Appliance Repair',
    image: applianceImg,
    alt: 'Refrigerator Repair — Professional Appliance Repair service in Lucknow',
    isParentFallback: true
  },
  'appliance-repair::washing-machine-repair': {
    name: 'Washing Machine Repair',
    slug: 'washing-machine-repair',
    categorySlug: 'appliance-repair',
    categoryName: 'Appliance Repair',
    image: applianceImg,
    alt: 'Washing Machine Repair — Professional Appliance Repair service in Lucknow',
    isParentFallback: true
  },
  'appliance-repair::microwave-repair': {
    name: 'Microwave Repair',
    slug: 'microwave-repair',
    categorySlug: 'appliance-repair',
    categoryName: 'Appliance Repair',
    image: applianceImg,
    alt: 'Microwave Repair — Professional Appliance Repair service in Lucknow',
    isParentFallback: true
  },
  'appliance-repair::cooler-repair': {
    name: 'Cooler Repair',
    slug: 'cooler-repair',
    categorySlug: 'appliance-repair',
    categoryName: 'Appliance Repair',
    image: applianceImg,
    alt: 'Cooler Repair — Professional Appliance Repair service in Lucknow',
    isParentFallback: true
  },
  'appliance-repair::dishwasher-repair': {
    name: 'Dishwasher Repair',
    slug: 'dishwasher-repair',
    categorySlug: 'appliance-repair',
    categoryName: 'Appliance Repair',
    image: applianceImg,
    alt: 'Dishwasher Repair — Professional Appliance Repair service in Lucknow',
    isParentFallback: true
  },
  'appliance-repair::small-appliance-repair': {
    name: 'Small Appliance Repair',
    slug: 'small-appliance-repair',
    categorySlug: 'appliance-repair',
    categoryName: 'Appliance Repair',
    image: applianceImg,
    alt: 'Small Appliance Repair — Professional Appliance Repair service in Lucknow',
    isParentFallback: true
  },
  'carpentry-furniture::carpenter': {
    name: 'Carpenter',
    slug: 'carpenter',
    categorySlug: 'carpentry-furniture',
    categoryName: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Carpenter — Professional Carpentry & Furniture service in Lucknow',
    isParentFallback: true
  },
  'carpentry-furniture::furniture-repair': {
    name: 'Furniture Repair',
    slug: 'furniture-repair',
    categorySlug: 'carpentry-furniture',
    categoryName: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Furniture Repair — Professional Carpentry & Furniture service in Lucknow',
    isParentFallback: true
  },
  'carpentry-furniture::door-and-window-repair': {
    name: 'Door and Window Repair',
    slug: 'door-and-window-repair',
    categorySlug: 'carpentry-furniture',
    categoryName: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Door and Window Repair — Professional Carpentry & Furniture service in Lucknow',
    isParentFallback: true
  },
  'carpentry-furniture::furniture-assembly': {
    name: 'Furniture Assembly',
    slug: 'furniture-assembly',
    categorySlug: 'carpentry-furniture',
    categoryName: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Furniture Assembly — Professional Carpentry & Furniture service in Lucknow',
    isParentFallback: true
  },
  'carpentry-furniture::cabinet-installation': {
    name: 'Cabinet Installation',
    slug: 'cabinet-installation',
    categorySlug: 'carpentry-furniture',
    categoryName: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Cabinet Installation — Professional Carpentry & Furniture service in Lucknow',
    isParentFallback: true
  },
  'carpentry-furniture::custom-woodwork': {
    name: 'Custom Woodwork',
    slug: 'custom-woodwork',
    categorySlug: 'carpentry-furniture',
    categoryName: 'Carpentry & Furniture',
    image: carpentryImg,
    alt: 'Custom Woodwork — Professional Carpentry & Furniture service in Lucknow',
    isParentFallback: true
  },
  'home-cleaning::home-deep-cleaning': {
    name: 'Home Deep Cleaning',
    slug: 'home-deep-cleaning',
    categorySlug: 'home-cleaning',
    categoryName: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Home Deep Cleaning — Professional Home Cleaning service in Lucknow',
    isParentFallback: true
  },
  'home-cleaning::bathroom-cleaning': {
    name: 'Bathroom Cleaning',
    slug: 'bathroom-cleaning',
    categorySlug: 'home-cleaning',
    categoryName: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Bathroom Cleaning — Professional Home Cleaning service in Lucknow',
    isParentFallback: true
  },
  'home-cleaning::kitchen-cleaning': {
    name: 'Kitchen Cleaning',
    slug: 'kitchen-cleaning',
    categorySlug: 'home-cleaning',
    categoryName: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Kitchen Cleaning — Professional Home Cleaning service in Lucknow',
    isParentFallback: true
  },
  'home-cleaning::sofa-and-upholstery-cleaning': {
    name: 'Sofa and Upholstery Cleaning',
    slug: 'sofa-and-upholstery-cleaning',
    categorySlug: 'home-cleaning',
    categoryName: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Sofa and Upholstery Cleaning — Professional Home Cleaning service in Lucknow',
    isParentFallback: true
  },
  'home-cleaning::move-in-and-move-out-cleaning': {
    name: 'Move-in and Move-out Cleaning',
    slug: 'move-in-and-move-out-cleaning',
    categorySlug: 'home-cleaning',
    categoryName: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Move-in and Move-out Cleaning — Professional Home Cleaning service in Lucknow',
    isParentFallback: true
  },
  'home-cleaning::post-construction-cleaning': {
    name: 'Post-construction Cleaning',
    slug: 'post-construction-cleaning',
    categorySlug: 'home-cleaning',
    categoryName: 'Home Cleaning',
    image: cleaningImg,
    alt: 'Post-construction Cleaning — Professional Home Cleaning service in Lucknow',
    isParentFallback: true
  },
  'painting-services::interior-painting': {
    name: 'Interior Painting',
    slug: 'interior-painting',
    categorySlug: 'painting-services',
    categoryName: 'Painting Services',
    image: paintingImg,
    alt: 'Interior Painting — Professional Painting Services service in Lucknow',
    isParentFallback: true
  },
  'painting-services::exterior-painting': {
    name: 'Exterior Painting',
    slug: 'exterior-painting',
    categorySlug: 'painting-services',
    categoryName: 'Painting Services',
    image: paintingImg,
    alt: 'Exterior Painting — Professional Painting Services service in Lucknow',
    isParentFallback: true
  },
  'painting-services::wall-preparation': {
    name: 'Wall Preparation',
    slug: 'wall-preparation',
    categorySlug: 'painting-services',
    categoryName: 'Painting Services',
    image: paintingImg,
    alt: 'Wall Preparation — Professional Painting Services service in Lucknow',
    isParentFallback: true
  },
  'painting-services::wallpaper-application': {
    name: 'Wallpaper Application',
    slug: 'wallpaper-application',
    categorySlug: 'painting-services',
    categoryName: 'Painting Services',
    image: paintingImg,
    alt: 'Wallpaper Application — Professional Painting Services service in Lucknow',
    isParentFallback: true
  },
  'painting-services::texture-painting': {
    name: 'Texture Painting',
    slug: 'texture-painting',
    categorySlug: 'painting-services',
    categoryName: 'Painting Services',
    image: paintingImg,
    alt: 'Texture Painting — Professional Painting Services service in Lucknow',
    isParentFallback: true
  },
  'painting-services::touch-up-and-repainting': {
    name: 'Touch-up and Repainting',
    slug: 'touch-up-and-repainting',
    categorySlug: 'painting-services',
    categoryName: 'Painting Services',
    image: paintingImg,
    alt: 'Touch-up and Repainting — Professional Painting Services service in Lucknow',
    isParentFallback: true
  },
  'pest-control::cockroach-control': {
    name: 'Cockroach Control',
    slug: 'cockroach-control',
    categorySlug: 'pest-control',
    categoryName: 'Pest Control',
    image: pestControlImg,
    alt: 'Cockroach Control — Professional Pest Control service in Lucknow',
    isParentFallback: true
  },
  'pest-control::termite-treatment': {
    name: 'Termite Treatment',
    slug: 'termite-treatment',
    categorySlug: 'pest-control',
    categoryName: 'Pest Control',
    image: pestControlImg,
    alt: 'Termite Treatment — Professional Pest Control service in Lucknow',
    isParentFallback: true
  },
  'pest-control::mosquito-control': {
    name: 'Mosquito Control',
    slug: 'mosquito-control',
    categorySlug: 'pest-control',
    categoryName: 'Pest Control',
    image: pestControlImg,
    alt: 'Mosquito Control — Professional Pest Control service in Lucknow',
    isParentFallback: true
  },
  'pest-control::rodent-control': {
    name: 'Rodent Control',
    slug: 'rodent-control',
    categorySlug: 'pest-control',
    categoryName: 'Pest Control',
    image: pestControlImg,
    alt: 'Rodent Control — Professional Pest Control service in Lucknow',
    isParentFallback: true
  },
  'pest-control::ant-control': {
    name: 'Ant Control',
    slug: 'ant-control',
    categorySlug: 'pest-control',
    categoryName: 'Pest Control',
    image: pestControlImg,
    alt: 'Ant Control — Professional Pest Control service in Lucknow',
    isParentFallback: true
  },
  'pest-control::general-pest-management': {
    name: 'General Pest Management',
    slug: 'general-pest-management',
    categorySlug: 'pest-control',
    categoryName: 'Pest Control',
    image: pestControlImg,
    alt: 'General Pest Management — Professional Pest Control service in Lucknow',
    isParentFallback: true
  },
  'locksmith-services::lock-repair': {
    name: 'Lock Repair',
    slug: 'lock-repair',
    categorySlug: 'locksmith-services',
    categoryName: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Lock Repair — Professional Locksmith Services service in Lucknow',
    isParentFallback: true
  },
  'locksmith-services::lock-replacement': {
    name: 'Lock Replacement',
    slug: 'lock-replacement',
    categorySlug: 'locksmith-services',
    categoryName: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Lock Replacement — Professional Locksmith Services service in Lucknow',
    isParentFallback: true
  },
  'locksmith-services::key-duplication': {
    name: 'Key Duplication',
    slug: 'key-duplication',
    categorySlug: 'locksmith-services',
    categoryName: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Key Duplication — Professional Locksmith Services service in Lucknow',
    isParentFallback: true
  },
  'locksmith-services::smart-lock-installation': {
    name: 'Smart Lock Installation',
    slug: 'smart-lock-installation',
    categorySlug: 'locksmith-services',
    categoryName: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Smart Lock Installation — Professional Locksmith Services service in Lucknow',
    isParentFallback: true
  },
  'locksmith-services::door-lockout-assistance': {
    name: 'Door Lockout Assistance',
    slug: 'door-lockout-assistance',
    categorySlug: 'locksmith-services',
    categoryName: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Door Lockout Assistance — Professional Locksmith Services service in Lucknow',
    isParentFallback: true
  },
  'locksmith-services::commercial-lock-services': {
    name: 'Commercial Lock Services',
    slug: 'commercial-lock-services',
    categorySlug: 'locksmith-services',
    categoryName: 'Locksmith Services',
    image: locksmithImg,
    alt: 'Commercial Lock Services — Professional Locksmith Services service in Lucknow',
    isParentFallback: true
  },
  'vehicle-repair::car-repair': {
    name: 'Car Repair',
    slug: 'car-repair',
    categorySlug: 'vehicle-repair',
    categoryName: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Car Repair — Professional Vehicle Repair & Maintenance service in Lucknow',
    isParentFallback: true
  },
  'vehicle-repair::bike-repair': {
    name: 'Bike Repair',
    slug: 'bike-repair',
    categorySlug: 'vehicle-repair',
    categoryName: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Bike Repair — Professional Vehicle Repair & Maintenance service in Lucknow',
    isParentFallback: true
  },
  'vehicle-repair::vehicle-servicing': {
    name: 'Vehicle Servicing',
    slug: 'vehicle-servicing',
    categorySlug: 'vehicle-repair',
    categoryName: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Vehicle Servicing — Professional Vehicle Repair & Maintenance service in Lucknow',
    isParentFallback: true
  },
  'vehicle-repair::battery-assistance': {
    name: 'Battery Assistance',
    slug: 'battery-assistance',
    categorySlug: 'vehicle-repair',
    categoryName: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Battery Assistance — Professional Vehicle Repair & Maintenance service in Lucknow',
    isParentFallback: true
  },
  'vehicle-repair::puncture-repair': {
    name: 'Puncture Repair',
    slug: 'puncture-repair',
    categorySlug: 'vehicle-repair',
    categoryName: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Puncture Repair — Professional Vehicle Repair & Maintenance service in Lucknow',
    isParentFallback: true
  },
  'vehicle-repair::roadside-assistance': {
    name: 'Roadside Assistance',
    slug: 'roadside-assistance',
    categorySlug: 'vehicle-repair',
    categoryName: 'Vehicle Repair & Maintenance',
    image: vehicleImg,
    alt: 'Roadside Assistance — Professional Vehicle Repair & Maintenance service in Lucknow',
    isParentFallback: true
  },
  'packers-movers::household-shifting': {
    name: 'Household Shifting',
    slug: 'household-shifting',
    categorySlug: 'packers-movers',
    categoryName: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Household Shifting — Professional Home Shifting & Packers service in Lucknow',
    isParentFallback: true
  },
  'packers-movers::office-relocation': {
    name: 'Office Relocation',
    slug: 'office-relocation',
    categorySlug: 'packers-movers',
    categoryName: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Office Relocation — Professional Home Shifting & Packers service in Lucknow',
    isParentFallback: true
  },
  'packers-movers::packing-and-unpacking': {
    name: 'Packing and Unpacking',
    slug: 'packing-and-unpacking',
    categorySlug: 'packers-movers',
    categoryName: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Packing and Unpacking — Professional Home Shifting & Packers service in Lucknow',
    isParentFallback: true
  },
  'packers-movers::loading-and-unloading': {
    name: 'Loading and Unloading',
    slug: 'loading-and-unloading',
    categorySlug: 'packers-movers',
    categoryName: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Loading and Unloading — Professional Home Shifting & Packers service in Lucknow',
    isParentFallback: true
  },
  'packers-movers::furniture-transportation': {
    name: 'Furniture Transportation',
    slug: 'furniture-transportation',
    categorySlug: 'packers-movers',
    categoryName: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Furniture Transportation — Professional Home Shifting & Packers service in Lucknow',
    isParentFallback: true
  },
  'packers-movers::local-moving-assistance': {
    name: 'Local Moving Assistance',
    slug: 'local-moving-assistance',
    categorySlug: 'packers-movers',
    categoryName: 'Home Shifting & Packers',
    image: packersImg,
    alt: 'Local Moving Assistance — Professional Home Shifting & Packers service in Lucknow',
    isParentFallback: true
  },
  'construction-masonry::masonry': {
    name: 'Masonry',
    slug: 'masonry',
    categorySlug: 'construction-masonry',
    categoryName: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Masonry — Professional Construction & Masonry service in Lucknow',
    isParentFallback: true
  },
  'construction-masonry::brickwork': {
    name: 'Brickwork',
    slug: 'brickwork',
    categorySlug: 'construction-masonry',
    categoryName: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Brickwork — Professional Construction & Masonry service in Lucknow',
    isParentFallback: true
  },
  'construction-masonry::plastering': {
    name: 'Plastering',
    slug: 'plastering',
    categorySlug: 'construction-masonry',
    categoryName: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Plastering — Professional Construction & Masonry service in Lucknow',
    isParentFallback: true
  },
  'construction-masonry::concrete-work': {
    name: 'Concrete Work',
    slug: 'concrete-work',
    categorySlug: 'construction-masonry',
    categoryName: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Concrete Work — Professional Construction & Masonry service in Lucknow',
    isParentFallback: true
  },
  'construction-masonry::wall-demolition': {
    name: 'Wall Demolition',
    slug: 'wall-demolition',
    categorySlug: 'construction-masonry',
    categoryName: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Wall Demolition — Professional Construction & Masonry service in Lucknow',
    isParentFallback: true
  },
  'construction-masonry::minor-structural-repairs': {
    name: 'Minor Structural Repairs',
    slug: 'minor-structural-repairs',
    categorySlug: 'construction-masonry',
    categoryName: 'Construction & Masonry',
    image: constructionImg,
    alt: 'Minor Structural Repairs — Professional Construction & Masonry service in Lucknow',
    isParentFallback: true
  },
  'tile-flooring::tile-installation': {
    name: 'Tile Installation',
    slug: 'tile-installation',
    categorySlug: 'tile-flooring',
    categoryName: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Tile Installation — Professional Tile & Flooring service in Lucknow',
    isParentFallback: true
  },
  'tile-flooring::tile-repair': {
    name: 'Tile Repair',
    slug: 'tile-repair',
    categorySlug: 'tile-flooring',
    categoryName: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Tile Repair — Professional Tile & Flooring service in Lucknow',
    isParentFallback: true
  },
  'tile-flooring::marble-installation': {
    name: 'Marble Installation',
    slug: 'marble-installation',
    categorySlug: 'tile-flooring',
    categoryName: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Marble Installation — Professional Tile & Flooring service in Lucknow',
    isParentFallback: true
  },
  'tile-flooring::granite-work': {
    name: 'Granite Work',
    slug: 'granite-work',
    categorySlug: 'tile-flooring',
    categoryName: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Granite Work — Professional Tile & Flooring service in Lucknow',
    isParentFallback: true
  },
  'tile-flooring::floor-polishing': {
    name: 'Floor Polishing',
    slug: 'floor-polishing',
    categorySlug: 'tile-flooring',
    categoryName: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Floor Polishing — Professional Tile & Flooring service in Lucknow',
    isParentFallback: true
  },
  'tile-flooring::grouting-and-regrouting': {
    name: 'Grouting and Regrouting',
    slug: 'grouting-and-regrouting',
    categorySlug: 'tile-flooring',
    categoryName: 'Tile & Flooring',
    image: tileFlooringImg,
    alt: 'Grouting and Regrouting — Professional Tile & Flooring service in Lucknow',
    isParentFallback: true
  },
  'waterproofing-roofing::terrace-waterproofing': {
    name: 'Terrace Waterproofing',
    slug: 'terrace-waterproofing',
    categorySlug: 'waterproofing-roofing',
    categoryName: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Terrace Waterproofing — Professional Waterproofing & Roofing service in Lucknow',
    isParentFallback: true
  },
  'waterproofing-roofing::roof-leakage-repair': {
    name: 'Roof Leakage Repair',
    slug: 'roof-leakage-repair',
    categorySlug: 'waterproofing-roofing',
    categoryName: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Roof Leakage Repair — Professional Waterproofing & Roofing service in Lucknow',
    isParentFallback: true
  },
  'waterproofing-roofing::bathroom-waterproofing': {
    name: 'Bathroom Waterproofing',
    slug: 'bathroom-waterproofing',
    categorySlug: 'waterproofing-roofing',
    categoryName: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Bathroom Waterproofing — Professional Waterproofing & Roofing service in Lucknow',
    isParentFallback: true
  },
  'waterproofing-roofing::wall-seepage-repair': {
    name: 'Wall Seepage Repair',
    slug: 'wall-seepage-repair',
    categorySlug: 'waterproofing-roofing',
    categoryName: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Wall Seepage Repair — Professional Waterproofing & Roofing service in Lucknow',
    isParentFallback: true
  },
  'waterproofing-roofing::roof-maintenance': {
    name: 'Roof Maintenance',
    slug: 'roof-maintenance',
    categorySlug: 'waterproofing-roofing',
    categoryName: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Roof Maintenance — Professional Waterproofing & Roofing service in Lucknow',
    isParentFallback: true
  },
  'waterproofing-roofing::crack-sealing': {
    name: 'Crack Sealing',
    slug: 'crack-sealing',
    categorySlug: 'waterproofing-roofing',
    categoryName: 'Waterproofing & Roofing',
    image: waterproofingImg,
    alt: 'Crack Sealing — Professional Waterproofing & Roofing service in Lucknow',
    isParentFallback: true
  },
  'gardening-landscaping::gardener': {
    name: 'Gardener',
    slug: 'gardener',
    categorySlug: 'gardening-landscaping',
    categoryName: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Gardener — Professional Gardening & Landscaping service in Lucknow',
    isParentFallback: true
  },
  'gardening-landscaping::lawn-maintenance': {
    name: 'Lawn Maintenance',
    slug: 'lawn-maintenance',
    categorySlug: 'gardening-landscaping',
    categoryName: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Lawn Maintenance — Professional Gardening & Landscaping service in Lucknow',
    isParentFallback: true
  },
  'gardening-landscaping::plant-care': {
    name: 'Plant Care',
    slug: 'plant-care',
    categorySlug: 'gardening-landscaping',
    categoryName: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Plant Care — Professional Gardening & Landscaping service in Lucknow',
    isParentFallback: true
  },
  'gardening-landscaping::tree-trimming': {
    name: 'Tree Trimming',
    slug: 'tree-trimming',
    categorySlug: 'gardening-landscaping',
    categoryName: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Tree Trimming — Professional Gardening & Landscaping service in Lucknow',
    isParentFallback: true
  },
  'gardening-landscaping::balcony-gardening': {
    name: 'Balcony Gardening',
    slug: 'balcony-gardening',
    categorySlug: 'gardening-landscaping',
    categoryName: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Balcony Gardening — Professional Gardening & Landscaping service in Lucknow',
    isParentFallback: true
  },
  'gardening-landscaping::landscape-installation': {
    name: 'Landscape Installation',
    slug: 'landscape-installation',
    categorySlug: 'gardening-landscaping',
    categoryName: 'Gardening & Landscaping',
    image: gardeningImg,
    alt: 'Landscape Installation — Professional Gardening & Landscaping service in Lucknow',
    isParentFallback: true
  },
  'laundry-dry-cleaning::laundry': {
    name: 'Laundry',
    slug: 'laundry',
    categorySlug: 'laundry-dry-cleaning',
    categoryName: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Laundry — Professional Laundry & Dry Cleaning service in Lucknow',
    isParentFallback: true
  },
  'laundry-dry-cleaning::ironing': {
    name: 'Ironing',
    slug: 'ironing',
    categorySlug: 'laundry-dry-cleaning',
    categoryName: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Ironing — Professional Laundry & Dry Cleaning service in Lucknow',
    isParentFallback: true
  },
  'laundry-dry-cleaning::dry-cleaning': {
    name: 'Dry Cleaning',
    slug: 'dry-cleaning',
    categorySlug: 'laundry-dry-cleaning',
    categoryName: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Dry Cleaning — Professional Laundry & Dry Cleaning service in Lucknow',
    isParentFallback: true
  },
  'laundry-dry-cleaning::curtain-cleaning': {
    name: 'Curtain Cleaning',
    slug: 'curtain-cleaning',
    categorySlug: 'laundry-dry-cleaning',
    categoryName: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Curtain Cleaning — Professional Laundry & Dry Cleaning service in Lucknow',
    isParentFallback: true
  },
  'laundry-dry-cleaning::blanket-and-quilt-cleaning': {
    name: 'Blanket and Quilt Cleaning',
    slug: 'blanket-and-quilt-cleaning',
    categorySlug: 'laundry-dry-cleaning',
    categoryName: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Blanket and Quilt Cleaning — Professional Laundry & Dry Cleaning service in Lucknow',
    isParentFallback: true
  },
  'laundry-dry-cleaning::wash-and-fold': {
    name: 'Wash and Fold',
    slug: 'wash-and-fold',
    categorySlug: 'laundry-dry-cleaning',
    categoryName: 'Laundry & Dry Cleaning',
    image: laundryImg,
    alt: 'Wash and Fold — Professional Laundry & Dry Cleaning service in Lucknow',
    isParentFallback: true
  },
  'beauty-salon::haircut-and-grooming': {
    name: 'Haircut and Grooming',
    slug: 'haircut-and-grooming',
    categorySlug: 'beauty-salon',
    categoryName: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Haircut and Grooming — Professional Beauty & Salon at Home service in Lucknow',
    isParentFallback: true
  },
  'beauty-salon::makeup-artist': {
    name: 'Makeup Artist',
    slug: 'makeup-artist',
    categorySlug: 'beauty-salon',
    categoryName: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Makeup Artist — Professional Beauty & Salon at Home service in Lucknow',
    isParentFallback: true
  },
  'beauty-salon::facial-and-skincare': {
    name: 'Facial and Skincare',
    slug: 'facial-and-skincare',
    categorySlug: 'beauty-salon',
    categoryName: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Facial and Skincare — Professional Beauty & Salon at Home service in Lucknow',
    isParentFallback: true
  },
  'beauty-salon::hair-styling': {
    name: 'Hair Styling',
    slug: 'hair-styling',
    categorySlug: 'beauty-salon',
    categoryName: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Hair Styling — Professional Beauty & Salon at Home service in Lucknow',
    isParentFallback: true
  },
  'beauty-salon::bridal-makeup': {
    name: 'Bridal Makeup',
    slug: 'bridal-makeup',
    categorySlug: 'beauty-salon',
    categoryName: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Bridal Makeup — Professional Beauty & Salon at Home service in Lucknow',
    isParentFallback: true
  },
  'beauty-salon::beauty-services-at-home': {
    name: 'Beauty Services at Home',
    slug: 'beauty-services-at-home',
    categorySlug: 'beauty-salon',
    categoryName: 'Beauty & Salon at Home',
    image: beautySalonImg,
    alt: 'Beauty Services at Home — Professional Beauty & Salon at Home service in Lucknow',
    isParentFallback: true
  },
  'computer-laptop-repair::laptop-repair': {
    name: 'Laptop Repair',
    slug: 'laptop-repair',
    categorySlug: 'computer-laptop-repair',
    categoryName: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Laptop Repair — Professional Computer & Laptop Repair service in Lucknow',
    isParentFallback: true
  },
  'computer-laptop-repair::desktop-repair': {
    name: 'Desktop Repair',
    slug: 'desktop-repair',
    categorySlug: 'computer-laptop-repair',
    categoryName: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Desktop Repair — Professional Computer & Laptop Repair service in Lucknow',
    isParentFallback: true
  },
  'computer-laptop-repair::hardware-replacement': {
    name: 'Hardware Replacement',
    slug: 'hardware-replacement',
    categorySlug: 'computer-laptop-repair',
    categoryName: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Hardware Replacement — Professional Computer & Laptop Repair service in Lucknow',
    isParentFallback: true
  },
  'computer-laptop-repair::software-troubleshooting': {
    name: 'Software Troubleshooting',
    slug: 'software-troubleshooting',
    categorySlug: 'computer-laptop-repair',
    categoryName: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Software Troubleshooting — Professional Computer & Laptop Repair service in Lucknow',
    isParentFallback: true
  },
  'computer-laptop-repair::operating-system-installation': {
    name: 'Operating System Installation',
    slug: 'operating-system-installation',
    categorySlug: 'computer-laptop-repair',
    categoryName: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Operating System Installation — Professional Computer & Laptop Repair service in Lucknow',
    isParentFallback: true
  },
  'computer-laptop-repair::data-recovery': {
    name: 'Data Recovery',
    slug: 'data-recovery',
    categorySlug: 'computer-laptop-repair',
    categoryName: 'Computer & Laptop Repair',
    image: computerRepairImg,
    alt: 'Data Recovery — Professional Computer & Laptop Repair service in Lucknow',
    isParentFallback: true
  },
  'cctv-security::cctv-installation': {
    name: 'CCTV Installation',
    slug: 'cctv-installation',
    categorySlug: 'cctv-security',
    categoryName: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'CCTV Installation — Professional CCTV & Security Systems service in Lucknow',
    isParentFallback: true
  },
  'cctv-security::camera-repair': {
    name: 'Camera Repair',
    slug: 'camera-repair',
    categorySlug: 'cctv-security',
    categoryName: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'Camera Repair — Professional CCTV & Security Systems service in Lucknow',
    isParentFallback: true
  },
  'cctv-security::dvr-and-nvr-setup': {
    name: 'DVR and NVR Setup',
    slug: 'dvr-and-nvr-setup',
    categorySlug: 'cctv-security',
    categoryName: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'DVR and NVR Setup — Professional CCTV & Security Systems service in Lucknow',
    isParentFallback: true
  },
  'cctv-security::access-control-systems': {
    name: 'Access Control Systems',
    slug: 'access-control-systems',
    categorySlug: 'cctv-security',
    categoryName: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'Access Control Systems — Professional CCTV & Security Systems service in Lucknow',
    isParentFallback: true
  },
  'cctv-security::alarm-installation': {
    name: 'Alarm Installation',
    slug: 'alarm-installation',
    categorySlug: 'cctv-security',
    categoryName: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'Alarm Installation — Professional CCTV & Security Systems service in Lucknow',
    isParentFallback: true
  },
  'cctv-security::security-system-maintenance': {
    name: 'Security System Maintenance',
    slug: 'security-system-maintenance',
    categorySlug: 'cctv-security',
    categoryName: 'CCTV & Security Systems',
    image: cctvSecurityImg,
    alt: 'Security System Maintenance — Professional CCTV & Security Systems service in Lucknow',
    isParentFallback: true
  },
  'internet-networking::wi-fi-setup': {
    name: 'Wi-Fi Setup',
    slug: 'wi-fi-setup',
    categorySlug: 'internet-networking',
    categoryName: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'Wi-Fi Setup — Professional Internet & Networking service in Lucknow',
    isParentFallback: true
  },
  'internet-networking::router-configuration': {
    name: 'Router Configuration',
    slug: 'router-configuration',
    categorySlug: 'internet-networking',
    categoryName: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'Router Configuration — Professional Internet & Networking service in Lucknow',
    isParentFallback: true
  },
  'internet-networking::lan-installation': {
    name: 'LAN Installation',
    slug: 'lan-installation',
    categorySlug: 'internet-networking',
    categoryName: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'LAN Installation — Professional Internet & Networking service in Lucknow',
    isParentFallback: true
  },
  'internet-networking::network-troubleshooting': {
    name: 'Network Troubleshooting',
    slug: 'network-troubleshooting',
    categorySlug: 'internet-networking',
    categoryName: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'Network Troubleshooting — Professional Internet & Networking service in Lucknow',
    isParentFallback: true
  },
  'internet-networking::structured-cabling': {
    name: 'Structured Cabling',
    slug: 'structured-cabling',
    categorySlug: 'internet-networking',
    categoryName: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'Structured Cabling — Professional Internet & Networking service in Lucknow',
    isParentFallback: true
  },
  'internet-networking::network-equipment-installation': {
    name: 'Network Equipment Installation',
    slug: 'network-equipment-installation',
    categorySlug: 'internet-networking',
    categoryName: 'Internet & Networking',
    image: internetNetworkingImg,
    alt: 'Network Equipment Installation — Professional Internet & Networking service in Lucknow',
    isParentFallback: true
  },
  'ro-water-purifier::ro-installation': {
    name: 'RO Installation',
    slug: 'ro-installation',
    categorySlug: 'ro-water-purifier',
    categoryName: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'RO Installation — Professional RO & Water Purifier service in Lucknow',
    isParentFallback: true
  },
  'ro-water-purifier::filter-replacement': {
    name: 'Filter Replacement',
    slug: 'filter-replacement',
    categorySlug: 'ro-water-purifier',
    categoryName: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'Filter Replacement — Professional RO & Water Purifier service in Lucknow',
    isParentFallback: true
  },
  'ro-water-purifier::water-purifier-servicing': {
    name: 'Water Purifier Servicing',
    slug: 'water-purifier-servicing',
    categorySlug: 'ro-water-purifier',
    categoryName: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'Water Purifier Servicing — Professional RO & Water Purifier service in Lucknow',
    isParentFallback: true
  },
  'ro-water-purifier::ro-repair': {
    name: 'RO Repair',
    slug: 'ro-repair',
    categorySlug: 'ro-water-purifier',
    categoryName: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'RO Repair — Professional RO & Water Purifier service in Lucknow',
    isParentFallback: true
  },
  'ro-water-purifier::tds-checking': {
    name: 'TDS Checking',
    slug: 'tds-checking',
    categorySlug: 'ro-water-purifier',
    categoryName: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'TDS Checking — Professional RO & Water Purifier service in Lucknow',
    isParentFallback: true
  },
  'ro-water-purifier::water-purifier-maintenance': {
    name: 'Water Purifier Maintenance',
    slug: 'water-purifier-maintenance',
    categorySlug: 'ro-water-purifier',
    categoryName: 'RO & Water Purifier',
    image: roWaterImg,
    alt: 'Water Purifier Maintenance — Professional RO & Water Purifier service in Lucknow',
    isParentFallback: true
  },
  'geyser-water-heater::geyser-installation': {
    name: 'Geyser Installation',
    slug: 'geyser-installation',
    categorySlug: 'geyser-water-heater',
    categoryName: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Geyser Installation — Professional Geyser & Water Heater service in Lucknow',
    isParentFallback: true
  },
  'geyser-water-heater::water-heater-repair': {
    name: 'Water Heater Repair',
    slug: 'water-heater-repair',
    categorySlug: 'geyser-water-heater',
    categoryName: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Water Heater Repair — Professional Geyser & Water Heater service in Lucknow',
    isParentFallback: true
  },
  'geyser-water-heater::thermostat-replacement': {
    name: 'Thermostat Replacement',
    slug: 'thermostat-replacement',
    categorySlug: 'geyser-water-heater',
    categoryName: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Thermostat Replacement — Professional Geyser & Water Heater service in Lucknow',
    isParentFallback: true
  },
  'geyser-water-heater::heating-element-replacement': {
    name: 'Heating Element Replacement',
    slug: 'heating-element-replacement',
    categorySlug: 'geyser-water-heater',
    categoryName: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Heating Element Replacement — Professional Geyser & Water Heater service in Lucknow',
    isParentFallback: true
  },
  'geyser-water-heater::geyser-maintenance': {
    name: 'Geyser Maintenance',
    slug: 'geyser-maintenance',
    categorySlug: 'geyser-water-heater',
    categoryName: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Geyser Maintenance — Professional Geyser & Water Heater service in Lucknow',
    isParentFallback: true
  },
  'geyser-water-heater::safety-inspection': {
    name: 'Safety Inspection',
    slug: 'safety-inspection',
    categorySlug: 'geyser-water-heater',
    categoryName: 'Geyser & Water Heater',
    image: geyserHeaterImg,
    alt: 'Safety Inspection — Professional Geyser & Water Heater service in Lucknow',
    isParentFallback: true
  },
  'solar-panel-services::solar-panel-installation': {
    name: 'Solar Panel Installation',
    slug: 'solar-panel-installation',
    categorySlug: 'solar-panel-services',
    categoryName: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Solar Panel Installation — Professional Solar Panel Services service in Lucknow',
    isParentFallback: true
  },
  'solar-panel-services::solar-panel-cleaning': {
    name: 'Solar Panel Cleaning',
    slug: 'solar-panel-cleaning',
    categorySlug: 'solar-panel-services',
    categoryName: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Solar Panel Cleaning — Professional Solar Panel Services service in Lucknow',
    isParentFallback: true
  },
  'solar-panel-services::inverter-installation': {
    name: 'Inverter Installation',
    slug: 'inverter-installation',
    categorySlug: 'solar-panel-services',
    categoryName: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Inverter Installation — Professional Solar Panel Services service in Lucknow',
    isParentFallback: true
  },
  'solar-panel-services::battery-maintenance': {
    name: 'Battery Maintenance',
    slug: 'battery-maintenance',
    categorySlug: 'solar-panel-services',
    categoryName: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Battery Maintenance — Professional Solar Panel Services service in Lucknow',
    isParentFallback: true
  },
  'solar-panel-services::solar-system-repair': {
    name: 'Solar System Repair',
    slug: 'solar-system-repair',
    categorySlug: 'solar-panel-services',
    categoryName: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Solar System Repair — Professional Solar Panel Services service in Lucknow',
    isParentFallback: true
  },
  'solar-panel-services::solar-maintenance': {
    name: 'Solar Maintenance',
    slug: 'solar-maintenance',
    categorySlug: 'solar-panel-services',
    categoryName: 'Solar Panel Services',
    image: solarPanelImg,
    alt: 'Solar Maintenance — Professional Solar Panel Services service in Lucknow',
    isParentFallback: true
  },
  'interior-design::interior-design': {
    name: 'Interior Design',
    slug: 'interior-design',
    categorySlug: 'interior-design',
    categoryName: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'Interior Design — Professional Interior Design & Modular Kitchen service in Lucknow',
    isParentFallback: true
  },
  'interior-design::modular-kitchen': {
    name: 'Modular Kitchen',
    slug: 'modular-kitchen',
    categorySlug: 'interior-design',
    categoryName: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'Modular Kitchen — Professional Interior Design & Modular Kitchen service in Lucknow',
    isParentFallback: true
  },
  'interior-design::wardrobe-design': {
    name: 'Wardrobe Design',
    slug: 'wardrobe-design',
    categorySlug: 'interior-design',
    categoryName: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'Wardrobe Design — Professional Interior Design & Modular Kitchen service in Lucknow',
    isParentFallback: true
  },
  'interior-design::false-ceiling': {
    name: 'False Ceiling',
    slug: 'false-ceiling',
    categorySlug: 'interior-design',
    categoryName: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'False Ceiling — Professional Interior Design & Modular Kitchen service in Lucknow',
    isParentFallback: true
  },
  'interior-design::tv-unit-installation': {
    name: 'TV Unit Installation',
    slug: 'tv-unit-installation',
    categorySlug: 'interior-design',
    categoryName: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'TV Unit Installation — Professional Interior Design & Modular Kitchen service in Lucknow',
    isParentFallback: true
  },
  'interior-design::space-planning': {
    name: 'Space Planning',
    slug: 'space-planning',
    categorySlug: 'interior-design',
    categoryName: 'Interior Design & Modular Kitchen',
    image: interiorDesignImg,
    alt: 'Space Planning — Professional Interior Design & Modular Kitchen service in Lucknow',
    isParentFallback: true
  },
  'glass-aluminium::glass-installation': {
    name: 'Glass Installation',
    slug: 'glass-installation',
    categorySlug: 'glass-aluminium',
    categoryName: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Glass Installation — Professional Glass & Aluminium Work service in Lucknow',
    isParentFallback: true
  },
  'glass-aluminium::aluminium-doors': {
    name: 'Aluminium Doors',
    slug: 'aluminium-doors',
    categorySlug: 'glass-aluminium',
    categoryName: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Aluminium Doors — Professional Glass & Aluminium Work service in Lucknow',
    isParentFallback: true
  },
  'glass-aluminium::aluminium-windows': {
    name: 'Aluminium Windows',
    slug: 'aluminium-windows',
    categorySlug: 'glass-aluminium',
    categoryName: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Aluminium Windows — Professional Glass & Aluminium Work service in Lucknow',
    isParentFallback: true
  },
  'glass-aluminium::glass-partitions': {
    name: 'Glass Partitions',
    slug: 'glass-partitions',
    categorySlug: 'glass-aluminium',
    categoryName: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Glass Partitions — Professional Glass & Aluminium Work service in Lucknow',
    isParentFallback: true
  },
  'glass-aluminium::shower-enclosures': {
    name: 'Shower Enclosures',
    slug: 'shower-enclosures',
    categorySlug: 'glass-aluminium',
    categoryName: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Shower Enclosures — Professional Glass & Aluminium Work service in Lucknow',
    isParentFallback: true
  },
  'glass-aluminium::glass-repair': {
    name: 'Glass Repair',
    slug: 'glass-repair',
    categorySlug: 'glass-aluminium',
    categoryName: 'Glass & Aluminium Work',
    image: glassAluminiumImg,
    alt: 'Glass Repair — Professional Glass & Aluminium Work service in Lucknow',
    isParentFallback: true
  },
  'curtains-blinds::curtain-installation': {
    name: 'Curtain Installation',
    slug: 'curtain-installation',
    categorySlug: 'curtains-blinds',
    categoryName: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Curtain Installation — Professional Curtains, Blinds & Wallpaper service in Lucknow',
    isParentFallback: true
  },
  'curtains-blinds::curtain-rod-fitting': {
    name: 'Curtain Rod Fitting',
    slug: 'curtain-rod-fitting',
    categorySlug: 'curtains-blinds',
    categoryName: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Curtain Rod Fitting — Professional Curtains, Blinds & Wallpaper service in Lucknow',
    isParentFallback: true
  },
  'curtains-blinds::roller-blinds': {
    name: 'Roller Blinds',
    slug: 'roller-blinds',
    categorySlug: 'curtains-blinds',
    categoryName: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Roller Blinds — Professional Curtains, Blinds & Wallpaper service in Lucknow',
    isParentFallback: true
  },
  'curtains-blinds::zebra-blinds': {
    name: 'Zebra Blinds',
    slug: 'zebra-blinds',
    categorySlug: 'curtains-blinds',
    categoryName: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Zebra Blinds — Professional Curtains, Blinds & Wallpaper service in Lucknow',
    isParentFallback: true
  },
  'curtains-blinds::wallpaper-installation': {
    name: 'Wallpaper Installation',
    slug: 'wallpaper-installation',
    categorySlug: 'curtains-blinds',
    categoryName: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Wallpaper Installation — Professional Curtains, Blinds & Wallpaper service in Lucknow',
    isParentFallback: true
  },
  'curtains-blinds::curtain-track-repair': {
    name: 'Curtain Track Repair',
    slug: 'curtain-track-repair',
    categorySlug: 'curtains-blinds',
    categoryName: 'Curtains, Blinds & Wallpaper',
    image: curtainsBlindsImg,
    alt: 'Curtain Track Repair — Professional Curtains, Blinds & Wallpaper service in Lucknow',
    isParentFallback: true
  },
  'home-installation::tv-wall-mounting': {
    name: 'TV Wall Mounting',
    slug: 'tv-wall-mounting',
    categorySlug: 'home-installation',
    categoryName: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'TV Wall Mounting — Professional Home Installation & Assembly service in Lucknow',
    isParentFallback: true
  },
  'home-installation::mirror-installation': {
    name: 'Mirror Installation',
    slug: 'mirror-installation',
    categorySlug: 'home-installation',
    categoryName: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'Mirror Installation — Professional Home Installation & Assembly service in Lucknow',
    isParentFallback: true
  },
  'home-installation::wall-fixtures': {
    name: 'Wall Fixtures',
    slug: 'wall-fixtures',
    categorySlug: 'home-installation',
    categoryName: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'Wall Fixtures — Professional Home Installation & Assembly service in Lucknow',
    isParentFallback: true
  },
  'home-installation::furniture-assembly': {
    name: 'Furniture Assembly',
    slug: 'furniture-assembly',
    categorySlug: 'home-installation',
    categoryName: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'Furniture Assembly — Professional Home Installation & Assembly service in Lucknow',
    isParentFallback: true
  },
  'home-installation::ceiling-fan-installation': {
    name: 'Ceiling Fan Installation',
    slug: 'ceiling-fan-installation',
    categorySlug: 'home-installation',
    categoryName: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'Ceiling Fan Installation — Professional Home Installation & Assembly service in Lucknow',
    isParentFallback: true
  },
  'home-installation::household-fixture-installation': {
    name: 'Household Fixture Installation',
    slug: 'household-fixture-installation',
    categorySlug: 'home-installation',
    categoryName: 'Home Installation & Assembly',
    image: homeInstallationImg,
    alt: 'Household Fixture Installation — Professional Home Installation & Assembly service in Lucknow',
    isParentFallback: true
  },
  'driving-transportation::personal-driver': {
    name: 'Personal Driver',
    slug: 'personal-driver',
    categorySlug: 'driving-transportation',
    categoryName: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Personal Driver — Professional Driving & Transportation service in Lucknow',
    isParentFallback: true
  },
  'driving-transportation::hourly-driver': {
    name: 'Hourly Driver',
    slug: 'hourly-driver',
    categorySlug: 'driving-transportation',
    categoryName: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Hourly Driver — Professional Driving & Transportation service in Lucknow',
    isParentFallback: true
  },
  'driving-transportation::outstation-driver': {
    name: 'Outstation Driver',
    slug: 'outstation-driver',
    categorySlug: 'driving-transportation',
    categoryName: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Outstation Driver — Professional Driving & Transportation service in Lucknow',
    isParentFallback: true
  },
  'driving-transportation::pickup-and-drop': {
    name: 'Pickup and Drop',
    slug: 'pickup-and-drop',
    categorySlug: 'driving-transportation',
    categoryName: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Pickup and Drop — Professional Driving & Transportation service in Lucknow',
    isParentFallback: true
  },
  'driving-transportation::vehicle-transportation': {
    name: 'Vehicle Transportation',
    slug: 'vehicle-transportation',
    categorySlug: 'driving-transportation',
    categoryName: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Vehicle Transportation — Professional Driving & Transportation service in Lucknow',
    isParentFallback: true
  },
  'driving-transportation::scheduled-local-transport': {
    name: 'Scheduled Local Transport',
    slug: 'scheduled-local-transport',
    categorySlug: 'driving-transportation',
    categoryName: 'Driving & Transportation',
    image: drivingTransportImg,
    alt: 'Scheduled Local Transport — Professional Driving & Transportation service in Lucknow',
    isParentFallback: true
  },
  'event-photography::event-photography': {
    name: 'Event Photography',
    slug: 'event-photography',
    categorySlug: 'event-photography',
    categoryName: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Event Photography — Professional Event & Photography Services service in Lucknow',
    isParentFallback: true
  },
  'event-photography::wedding-photography': {
    name: 'Wedding Photography',
    slug: 'wedding-photography',
    categorySlug: 'event-photography',
    categoryName: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Wedding Photography — Professional Event & Photography Services service in Lucknow',
    isParentFallback: true
  },
  'event-photography::videography': {
    name: 'Videography',
    slug: 'videography',
    categorySlug: 'event-photography',
    categoryName: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Videography — Professional Event & Photography Services service in Lucknow',
    isParentFallback: true
  },
  'event-photography::event-decoration': {
    name: 'Event Decoration',
    slug: 'event-decoration',
    categorySlug: 'event-photography',
    categoryName: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Event Decoration — Professional Event & Photography Services service in Lucknow',
    isParentFallback: true
  },
  'event-photography::birthday-event-setup': {
    name: 'Birthday Event Setup',
    slug: 'birthday-event-setup',
    categorySlug: 'event-photography',
    categoryName: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Birthday Event Setup — Professional Event & Photography Services service in Lucknow',
    isParentFallback: true
  },
  'event-photography::event-equipment-assistance': {
    name: 'Event Equipment Assistance',
    slug: 'event-equipment-assistance',
    categorySlug: 'event-photography',
    categoryName: 'Event & Photography Services',
    image: eventPhotographyImg,
    alt: 'Event Equipment Assistance — Professional Event & Photography Services service in Lucknow',
    isParentFallback: true
  },
  'other-services::handyman': {
    name: 'Handyman',
    slug: 'handyman',
    categorySlug: 'other-services',
    categoryName: 'Other Local Services',
    image: otherServicesImg,
    alt: 'Handyman — Professional Other Local Services service in Lucknow',
    isParentFallback: true
  },
  'other-services::general-household-repairs': {
    name: 'General Household Repairs',
    slug: 'general-household-repairs',
    categorySlug: 'other-services',
    categoryName: 'Other Local Services',
    image: otherServicesImg,
    alt: 'General Household Repairs — Professional Other Local Services service in Lucknow',
    isParentFallback: true
  },
  'other-services::pressure-washing': {
    name: 'Pressure Washing',
    slug: 'pressure-washing',
    categorySlug: 'other-services',
    categoryName: 'Other Local Services',
    image: otherServicesImg,
    alt: 'Pressure Washing — Professional Other Local Services service in Lucknow',
    isParentFallback: true
  },
  'other-services::gutter-cleaning': {
    name: 'Gutter Cleaning',
    slug: 'gutter-cleaning',
    categorySlug: 'other-services',
    categoryName: 'Other Local Services',
    image: otherServicesImg,
    alt: 'Gutter Cleaning — Professional Other Local Services service in Lucknow',
    isParentFallback: true
  },
  'other-services::miscellaneous-home-assistance': {
    name: 'Miscellaneous Home Assistance',
    slug: 'miscellaneous-home-assistance',
    categorySlug: 'other-services',
    categoryName: 'Other Local Services',
    image: otherServicesImg,
    alt: 'Miscellaneous Home Assistance — Professional Other Local Services service in Lucknow',
    isParentFallback: true
  },
  'other-services::other-approved-local-services': {
    name: 'Other Approved Local Services',
    slug: 'other-approved-local-services',
    categorySlug: 'other-services',
    categoryName: 'Other Local Services',
    image: otherServicesImg,
    alt: 'Other Approved Local Services — Professional Other Local Services service in Lucknow',
    isParentFallback: true
  }
};

// Keyword dictionary for content-based fallback matching
const KEYWORD_CATEGORY_MAP = [
  { slug: 'electrical-services', keywords: ['electric', 'wiring', 'switchboard', 'mcb', 'inverter', 'light', 'fan installation', 'power outage', 'spark'] },
  { slug: 'plumbing-services', keywords: ['plumb', 'pipe', 'leak', 'faucet', 'tap', 'drain', 'drainage', 'toilet', 'flush', 'water tank', 'sewage'] },
  { slug: 'ac-hvac-services', keywords: ['ac ', 'ac-', 'hvac', 'air condition', 'cooling', 'compressor', 'gas charging', 'split ac', 'window ac'] },
  { slug: 'appliance-repair', keywords: ['appliance', 'refrigerator', 'fridge', 'washing machine', 'microwave', 'cooler', 'dishwasher'] },
  { slug: 'carpentry-furniture', keywords: ['carpenter', 'carpentry', 'furniture', 'wood', 'cabinet', 'wardrobe repair', 'door repair', 'wooden'] },
  { slug: 'home-cleaning', keywords: ['clean', 'cleaning', 'deep clean', 'sofa clean', 'kitchen clean', 'bathroom clean', 'post-construction clean', 'maid'] },
  { slug: 'painting-services', keywords: ['paint', 'painter', 'painting', 'wall putty', 'texture paint', 'whitewash', 'distemper'] },
  { slug: 'pest-control', keywords: ['pest', 'termite', 'cockroach', 'mosquito', 'rodent', 'bed bug', 'fumigation', 'insect'] },
  { slug: 'locksmith-services', keywords: ['locksmith', 'lock', 'key', 'door lock', 'deadbolt', 'smart lock', 'latch', 'lockout'] },
  { slug: 'vehicle-repair', keywords: ['mechanic', 'vehicle', 'car repair', 'bike repair', 'puncture', 'car service', 'engine repair', 'automobile'] },
  { slug: 'packers-movers', keywords: ['packer', 'mover', 'shifting', 'relocation', 'movers and packers', 'house shift'] },
  { slug: 'construction-masonry', keywords: ['mason', 'masonry', 'construction', 'brick', 'plaster', 'concrete', 'demolition'] },
  { slug: 'tile-flooring', keywords: ['tile', 'tiling', 'flooring', 'marble', 'granite', 'grouting', 'floor polish'] },
  { slug: 'waterproofing-roofing', keywords: ['waterproof', 'waterproofing', 'roof leak', 'roofing', 'seepage', 'terrace leak'] },
  { slug: 'gardening-landscaping', keywords: ['garden', 'gardener', 'gardening', 'landscape', 'landscaping', 'lawn', 'hedge', 'plant care'] },
  { slug: 'laundry-dry-cleaning', keywords: ['laundry', 'dry clean', 'ironing', 'wash and fold', 'steam iron', 'garment'] },
  { slug: 'beauty-salon', keywords: ['salon', 'beauty', 'haircut', 'grooming', 'facial', 'bridal', 'makeup', 'spa'] },
  { slug: 'computer-laptop-repair', keywords: ['laptop', 'computer', 'pc repair', 'motherboard', 'screen replacement', 'desktop repair'] },
  { slug: 'cctv-security', keywords: ['cctv', 'surveillance', 'security camera', 'dvr', 'nvr', 'alarm'] },
  { slug: 'internet-networking', keywords: ['internet', 'wifi', 'wi-fi', 'network', 'router', 'lan', 'broadband', 'ethernet'] },
  { slug: 'ro-water-purifier', keywords: ['water purifier', 'ro repair', 'ro purifier', 'purifier', 'tds', 'water filter', 'aquaguard', 'kent'] },
  { slug: 'geyser-water-heater', keywords: ['geyser', 'water heater', 'heating element', 'immersion rod'] },
  { slug: 'solar-panel-services', keywords: ['solar', 'solar panel', 'photovoltaic', 'solar inverter'] },
  { slug: 'interior-design', keywords: ['interior', 'modular kitchen', 'false ceiling', 'space planning', '3d interior'] },
  { slug: 'glass-aluminium', keywords: ['glass', 'aluminium', 'aluminum', 'sliding door', 'glazier', 'glass partition'] },
  { slug: 'curtains-blinds', keywords: ['curtain', 'curtains', 'blind', 'blinds', 'wallpaper', 'roller blind'] },
  { slug: 'home-installation', keywords: ['tv install', 'tv wall mount', 'tv mounting', 'assembly', 'fixture installation', 'mirror mount'] },
  { slug: 'driving-transportation', keywords: ['driver', 'chauffeur', 'transport', 'transportation', 'car driver', 'hire driver'] },
  { slug: 'event-photography', keywords: ['photo', 'photographer', 'photography', 'videographer', 'videography', 'wedding shoot', 'event video'] },
  { slug: 'other-services', keywords: ['handyman', 'odd job', 'pressure wash', 'gutter', 'household repair'] }
];

/**
 * Attempts to match a category from unstructured text (e.g., job title or description).
 */
export function matchCategoryFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  for (const entry of KEYWORD_CATEGORY_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return CATEGORY_IMAGES[entry.slug] || null;
      }
    }
  }
  return null;
}

/**
 * Resolves full category media metadata by category slug, id, or object.
 */
export function getCategoryImage(category) {
  if (!category) {
    return {
      slug: 'other-services',
      name: 'Other Local Services',
      image: FALLBACK_SERVICE_IMAGE,
      alt: 'Professional Local Services',
      assetFile: 'Handyman Repairing a Home Door Lock.png'
    };
  }

  // Prioritize slug, then name/title before raw IDs to avoid ObjectId false matches
  const rawKey = typeof category === 'string'
    ? category
    : (category.slug || category.name || category.title || category.categoryName || category.id || category._id || '');

  const norm = normalizeServiceSlug(rawKey);
  const targetSlug = CATEGORY_ALIASES[norm] || norm;

  if (CATEGORY_IMAGES[targetSlug]) {
    return CATEGORY_IMAGES[targetSlug];
  }

  // Direct match by category.name
  for (const item of Object.values(CATEGORY_IMAGES)) {
    if (normalizeServiceSlug(item.name) === norm) {
      return item;
    }
  }

  // Content-based keyword fallback if category string contains recognizable keywords
  const keywordMatched = matchCategoryFromText(rawKey);
  if (keywordMatched) {
    return keywordMatched;
  }

  return {
    slug: targetSlug || 'other-services',
    name: typeof category === 'object' && category.name ? category.name : 'Professional Local Service',
    image: (typeof category === 'object' && category.image && !category.image.includes('unsplash.com')) 
      ? category.image 
      : FALLBACK_SERVICE_IMAGE,
    alt: (typeof category === 'object' && category.name) ? `${category.name} — Professional Service` : 'Professional Local Service',
    assetFile: 'Handyman Repairing a Home Door Lock.png'
  };
}

/**
 * Resolves a sub-service image, falling back gracefully to the parent category image.
 */
export function getSubServiceImage(category, subservice) {
  const catObj = getCategoryImage(category);
  if (!subservice) return catObj;

  const subSlug = normalizeServiceSlug(subservice);
  const compositeKey = `${catObj.slug}::${subSlug}`;

  if (SUBSERVICE_IMAGES[compositeKey]) {
    return SUBSERVICE_IMAGES[compositeKey];
  }

  // Match by subservice slug across all subservices
  for (const item of Object.values(SUBSERVICE_IMAGES)) {
    if (item.slug === subSlug) {
      return item;
    }
  }

  // Check if subservice string matches any keywords
  const kwSub = matchCategoryFromText(subservice);
  if (kwSub) {
    return {
      name: subservice,
      slug: subSlug,
      categorySlug: kwSub.slug,
      categoryName: kwSub.name,
      image: kwSub.image,
      alt: `${subservice} — ${kwSub.name}`,
      isParentFallback: true
    };
  }

  return {
    name: subservice,
    slug: subSlug,
    categorySlug: catObj.slug,
    categoryName: catObj.name,
    image: catObj.image,
    alt: `${subservice} — ${catObj.name}`,
    isParentFallback: true
  };
}

/**
 * Universal shortcut returning an image source URL for any category or sub-service.
 */
export function getServiceImage(category, subservice = null) {
  if (subservice) {
    return getSubServiceImage(category, subservice).image;
  }
  return getCategoryImage(category).image;
}

/**
 * Resolves the most accurate image and alt text for any job object.
 * Priority:
 * 1. Matching sub-service image
 * 2. Mapped parent category image
 * 3. Title/description keyword detection
 * 4. Generic fallback service image
 */
function formatJobImageResult(result) {
  if (!result || typeof result !== 'object') {
    return {
      image: FALLBACK_SERVICE_IMAGE,
      alt: 'Professional Local Services',
      categoryName: 'General Trade Service',
      subcategoryName: '',
      slug: 'other-services',
      toString() { return FALLBACK_SERVICE_IMAGE; }
    };
  }
  result.toString = function() { return this.image || FALLBACK_SERVICE_IMAGE; };
  result[Symbol.toPrimitive] = function() { return this.image || FALLBACK_SERVICE_IMAGE; };
  return result;
}

export function resolveJobImage(job) {
  if (!job) {
    return formatJobImageResult({
      image: FALLBACK_SERVICE_IMAGE,
      alt: 'Professional Local Services',
      categoryName: 'General Trade Service',
      subcategoryName: '',
      slug: 'other-services'
    });
  }

  const subservice = job.subcategory || job.subCategory || job.service || '';
  const category = job.category || '';

  // 1. Try resolving through subservice if provided
  if (subservice) {
    const subObj = getSubServiceImage(category, subservice);
    if (subObj && subObj.image) {
      return formatJobImageResult({
        image: subObj.image,
        alt: subObj.alt || `${job.title || subObj.name} — ${subObj.categoryName}`,
        categoryName: subObj.categoryName || job.category?.name || 'Trade Service',
        subcategoryName: subObj.name || subservice,
        slug: subObj.categorySlug || 'other-services'
      });
    }
  }

  // 2. Try resolving through category
  if (category) {
    const catObj = getCategoryImage(category);
    if (catObj && catObj.slug !== 'other-services') {
      return formatJobImageResult({
        image: catObj.image,
        alt: catObj.alt || `${job.title || catObj.name} — ${catObj.name}`,
        categoryName: catObj.name,
        subcategoryName: subservice,
        slug: catObj.slug
      });
    }
  }

  // 3. Title and description keyword analysis
  const textMatch = matchCategoryFromText(`${job.title || ''} ${job.description || ''}`);
  if (textMatch) {
    return formatJobImageResult({
      image: textMatch.image,
      alt: textMatch.alt || `${job.title || textMatch.name} — ${textMatch.name}`,
      categoryName: textMatch.name,
      subcategoryName: subservice,
      slug: textMatch.slug
    });
  }

  // 4. Default fallback
  const fallbackCat = getCategoryImage(category);
  return formatJobImageResult({
    image: fallbackCat.image,
    alt: fallbackCat.alt || `${job.title || 'Local Service'} — WorkLogy`,
    categoryName: fallbackCat.name || job.category?.name || 'Local Service',
    subcategoryName: subservice,
    slug: fallbackCat.slug
  });
}

/**
 * Returns image source URL for any job object.
 */
export function getJobImage(job) {
  const resolved = resolveJobImage(job);
  return (resolved && typeof resolved === 'object' && resolved.image) ? resolved.image : FALLBACK_SERVICE_IMAGE;
}

/**
 * Image error callback ensuring safe fallback.
 */
export function handleImageFallback(event, fallbackSrc = FALLBACK_SERVICE_IMAGE) {
  if (event?.target && event.target.src !== fallbackSrc) {
    event.target.onerror = null;
    event.target.src = fallbackSrc;
  }
}
