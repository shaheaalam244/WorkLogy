// 18 Service Zones & 90 Canonical Localities from Division_zone_wise.xlsx with verified PIN codes
export interface ZoneItem {
  zoneId: string;
  zoneName: string;
  centerArea: string;
  radiusKm: number;
  city?: string;
  coordinates: { lat: number; lng: number };
}

export interface LocalityItem {
  localityId: string;
  name: string;
  zoneId: string;
  zoneName: string;
  city: string;
  pinCode?: string;
  coordinates: { lat: number; lng: number };
}

export const CANONICAL_ZONES: ZoneItem[] = [
  {
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "centerArea": "Gomti Nagar",
    "radiusKm": 7,
    "coordinates": { "lat": 26.85, "lng": 80.9984 }
  },
  {
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "centerArea": "Indira Nagar",
    "radiusKm": 5,
    "coordinates": { "lat": 26.8833, "lng": 80.9833 }
  },
  {
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "centerArea": "Mahanagar",
    "radiusKm": 5,
    "coordinates": { "lat": 26.875, "lng": 80.95 }
  },
  {
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "centerArea": "Aliganj",
    "radiusKm": 5,
    "coordinates": { "lat": 26.8833, "lng": 80.9333 }
  },
  {
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "centerArea": "Jankipuram",
    "radiusKm": 6,
    "coordinates": { "lat": 26.9167, "lng": 80.9333 }
  },
  {
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "centerArea": "Vikas Nagar",
    "radiusKm": 5,
    "coordinates": { "lat": 26.89, "lng": 80.96 }
  },
  {
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "centerArea": "Hazratganj",
    "radiusKm": 4,
    "coordinates": { "lat": 26.8467, "lng": 80.9462 }
  },
  {
    "zoneId": "LKO-Z08",
    "zoneName": "Old City Lucknow",
    "centerArea": "Chowk",
    "radiusKm": 5,
    "coordinates": { "lat": 26.8667, "lng": 80.9 }
  },
  {
    "zoneId": "LKO-Z09",
    "zoneName": "West-Central Lucknow",
    "centerArea": "Rajajipuram",
    "radiusKm": 5,
    "coordinates": { "lat": 26.85, "lng": 80.8833 }
  },
  {
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "centerArea": "Alambagh",
    "radiusKm": 6,
    "coordinates": { "lat": 26.8167, "lng": 80.9 }
  },
  {
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "centerArea": "Ashiyana",
    "radiusKm": 6,
    "coordinates": { "lat": 26.7833, "lng": 80.9167 }
  },
  {
    "zoneId": "LKO-Z12",
    "zoneName": "Far South-West Lucknow",
    "centerArea": "Sarojini Nagar",
    "radiusKm": 8,
    "coordinates": { "lat": 26.75, "lng": 80.8667 }
  },
  {
    "zoneId": "LKO-Z13",
    "zoneName": "South-Central Lucknow",
    "centerArea": "Telibagh",
    "radiusKm": 6,
    "coordinates": { "lat": 26.7833, "lng": 80.95 }
  },
  {
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Lucknow",
    "centerArea": "Sushant Golf City",
    "radiusKm": 8,
    "coordinates": { "lat": 26.78, "lng": 81.01 }
  },
  {
    "zoneId": "LKO-Z15",
    "zoneName": "Far North Lucknow",
    "centerArea": "Bakshi Ka Talab",
    "radiusKm": 10,
    "coordinates": { "lat": 27.0, "lng": 80.9167 }
  },
  {
    "zoneId": "LKO-Z16",
    "zoneName": "Far East Lucknow",
    "centerArea": "Chinhat",
    "radiusKm": 7,
    "coordinates": { "lat": 26.8833, "lng": 81.05 }
  },
  {
    "zoneId": "LKO-Z17",
    "zoneName": "Far West Lucknow",
    "centerArea": "Kakori",
    "radiusKm": 9,
    "coordinates": { "lat": 26.8833, "lng": 80.8 }
  },
  {
    "zoneId": "LKO-Z18",
    "zoneName": "Inner-Central Lucknow",
    "centerArea": "Charbagh",
    "radiusKm": 4,
    "coordinates": { "lat": 26.8333, "lng": 80.9167 }
  }
];

export const CANONICAL_LOCALITIES: LocalityItem[] = [
  { "localityId": "LOC-LKO-001", "name": "Gomti Nagar", "zoneId": "LKO-Z01", "zoneName": "East Lucknow", "city": "Lucknow", "pinCode": "226010", "coordinates": { "lat": 26.85, "lng": 80.9984 } },
  { "localityId": "LOC-LKO-002", "name": "Vibhuti Khand", "zoneId": "LKO-Z01", "zoneName": "East Lucknow", "city": "Lucknow", "pinCode": "226010", "coordinates": { "lat": 26.8647, "lng": 81.0062 } },
  { "localityId": "LOC-LKO-003", "name": "Viram Khand", "zoneId": "LKO-Z01", "zoneName": "East Lucknow", "city": "Lucknow", "pinCode": "226010", "coordinates": { "lat": 26.853, "lng": 81.002 } },
  { "localityId": "LOC-LKO-004", "name": "Vineet Khand", "zoneId": "LKO-Z01", "zoneName": "East Lucknow", "city": "Lucknow", "pinCode": "226010", "coordinates": { "lat": 26.848, "lng": 81.008 } },
  { "localityId": "LOC-LKO-005", "name": "Vinay Khand", "zoneId": "LKO-Z01", "zoneName": "East Lucknow", "city": "Lucknow", "pinCode": "226010", "coordinates": { "lat": 26.842, "lng": 81.005 } },
  { "localityId": "LOC-LKO-006", "name": "Indira Nagar", "zoneId": "LKO-Z02", "zoneName": "East-Central Lucknow", "city": "Lucknow", "pinCode": "226016", "coordinates": { "lat": 26.8833, "lng": 80.9833 } },
  { "localityId": "LOC-LKO-007", "name": "Munshipulia", "zoneId": "LKO-Z02", "zoneName": "East-Central Lucknow", "city": "Lucknow", "pinCode": "226016", "coordinates": { "lat": 26.888, "lng": 80.99 } },
  { "localityId": "LOC-LKO-008", "name": "Bhootnath", "zoneId": "LKO-Z02", "zoneName": "East-Central Lucknow", "city": "Lucknow", "pinCode": "226016", "coordinates": { "lat": 26.879, "lng": 80.981 } },
  { "localityId": "LOC-LKO-009", "name": "Ismailganj", "zoneId": "LKO-Z02", "zoneName": "East-Central Lucknow", "city": "Lucknow", "pinCode": "226016", "coordinates": { "lat": 26.892, "lng": 80.998 } },
  { "localityId": "LOC-LKO-010", "name": "Faizabad Road", "zoneId": "LKO-Z02", "zoneName": "East-Central Lucknow", "city": "Lucknow", "pinCode": "226016", "coordinates": { "lat": 26.885, "lng": 81.0 } },
  { "localityId": "LOC-LKO-011", "name": "Mahanagar", "zoneId": "LKO-Z03", "zoneName": "North-Central Lucknow", "city": "Lucknow", "pinCode": "226006", "coordinates": { "lat": 26.875, "lng": 80.95 } },
  { "localityId": "LOC-LKO-012", "name": "Nishatganj", "zoneId": "LKO-Z03", "zoneName": "North-Central Lucknow", "city": "Lucknow", "pinCode": "226006", "coordinates": { "lat": 26.865, "lng": 80.958 } },
  { "localityId": "LOC-LKO-013", "name": "Daliganj", "zoneId": "LKO-Z03", "zoneName": "North-Central Lucknow", "city": "Lucknow", "pinCode": "226020", "coordinates": { "lat": 26.871, "lng": 80.938 } },
  { "localityId": "LOC-LKO-014", "name": "New Hyderabad", "zoneId": "LKO-Z03", "zoneName": "North-Central Lucknow", "city": "Lucknow", "pinCode": "226007", "coordinates": { "lat": 26.868, "lng": 80.947 } },
  { "localityId": "LOC-LKO-015", "name": "Niralanagar", "zoneId": "LKO-Z03", "zoneName": "North-Central Lucknow", "city": "Lucknow", "pinCode": "226020", "coordinates": { "lat": 26.879, "lng": 80.941 } },
  { "localityId": "LOC-LKO-016", "name": "Aliganj", "zoneId": "LKO-Z04", "zoneName": "North Lucknow", "city": "Lucknow", "pinCode": "226024", "coordinates": { "lat": 26.8833, "lng": 80.9333 } },
  { "localityId": "LOC-LKO-017", "name": "Kapoorthala", "zoneId": "LKO-Z04", "zoneName": "North Lucknow", "city": "Lucknow", "pinCode": "226024", "coordinates": { "lat": 26.88, "lng": 80.938 } },
  { "localityId": "LOC-LKO-018", "name": "Chandganj", "zoneId": "LKO-Z04", "zoneName": "North Lucknow", "city": "Lucknow", "pinCode": "226024", "coordinates": { "lat": 26.878, "lng": 80.934 } },
  { "localityId": "LOC-LKO-019", "name": "Kursi Road", "zoneId": "LKO-Z04", "zoneName": "North Lucknow", "city": "Lucknow", "pinCode": "226026", "coordinates": { "lat": 26.895, "lng": 80.935 } },
  { "localityId": "LOC-LKO-020", "name": "Triveni Nagar", "zoneId": "LKO-Z04", "zoneName": "North Lucknow", "city": "Lucknow", "pinCode": "226020", "coordinates": { "lat": 26.892, "lng": 80.925 } },
  { "localityId": "LOC-LKO-021", "name": "Jankipuram", "zoneId": "LKO-Z05", "zoneName": "North-West Lucknow", "city": "Lucknow", "pinCode": "226021", "coordinates": { "lat": 26.9167, "lng": 80.9333 } },
  { "localityId": "LOC-LKO-022", "name": "Gudamba", "zoneId": "LKO-Z05", "zoneName": "North-West Lucknow", "city": "Lucknow", "pinCode": "226026", "coordinates": { "lat": 26.928, "lng": 80.942 } },
  { "localityId": "LOC-LKO-023", "name": "Kalyanpur", "zoneId": "LKO-Z05", "zoneName": "North-West Lucknow", "city": "Lucknow", "pinCode": "226022", "coordinates": { "lat": 26.91, "lng": 80.92 } },
  { "localityId": "LOC-LKO-024", "name": "Madiyaon", "zoneId": "LKO-Z05", "zoneName": "North-West Lucknow", "city": "Lucknow", "pinCode": "226021", "coordinates": { "lat": 26.922, "lng": 80.915 } },
  { "localityId": "LOC-LKO-025", "name": "Jankipuram Extension", "zoneId": "LKO-Z05", "zoneName": "North-West Lucknow", "city": "Lucknow", "pinCode": "226021", "coordinates": { "lat": 26.935, "lng": 80.945 } },
  { "localityId": "LOC-LKO-026", "name": "Vikas Nagar", "zoneId": "LKO-Z06", "zoneName": "North-East Lucknow", "city": "Lucknow", "pinCode": "226022", "coordinates": { "lat": 26.89, "lng": 80.96 } },
  { "localityId": "LOC-LKO-027", "name": "Khurram Nagar", "zoneId": "LKO-Z06", "zoneName": "North-East Lucknow", "city": "Lucknow", "pinCode": "226022", "coordinates": { "lat": 26.893, "lng": 80.97 } },
  { "localityId": "LOC-LKO-028", "name": "Tedhi Puliya", "zoneId": "LKO-Z06", "zoneName": "North-East Lucknow", "city": "Lucknow", "pinCode": "226022", "coordinates": { "lat": 26.898, "lng": 80.965 } },
  { "localityId": "LOC-LKO-029", "name": "Engineering College", "zoneId": "LKO-Z06", "zoneName": "North-East Lucknow", "city": "Lucknow", "pinCode": "226021", "coordinates": { "lat": 26.912, "lng": 80.941 } },
  { "localityId": "LOC-LKO-030", "name": "Vikas Nagar Extension", "zoneId": "LKO-Z06", "zoneName": "North-East Lucknow", "city": "Lucknow", "pinCode": "226022", "coordinates": { "lat": 26.895, "lng": 80.955 } },
  { "localityId": "LOC-LKO-031", "name": "Hazratganj", "zoneId": "LKO-Z07", "zoneName": "Central Lucknow", "city": "Lucknow", "pinCode": "226001", "coordinates": { "lat": 26.8467, "lng": 80.9462 } },
  { "localityId": "LOC-LKO-032", "name": "Lalbagh", "zoneId": "LKO-Z07", "zoneName": "Central Lucknow", "city": "Lucknow", "pinCode": "226001", "coordinates": { "lat": 26.845, "lng": 80.938 } },
  { "localityId": "LOC-LKO-033", "name": "Narhi", "zoneId": "LKO-Z07", "zoneName": "Central Lucknow", "city": "Lucknow", "pinCode": "226001", "coordinates": { "lat": 26.848, "lng": 80.952 } },
  { "localityId": "LOC-LKO-034", "name": "Butler Colony", "zoneId": "LKO-Z07", "zoneName": "Central Lucknow", "city": "Lucknow", "pinCode": "226001", "coordinates": { "lat": 26.852, "lng": 80.96 } },
  { "localityId": "LOC-LKO-035", "name": "Civil Lines", "zoneId": "LKO-Z07", "zoneName": "Central Lucknow", "city": "Lucknow", "pinCode": "226001", "coordinates": { "lat": 26.842, "lng": 80.945 } },
  { "localityId": "LOC-LKO-036", "name": "Chowk", "zoneId": "LKO-Z08", "zoneName": "Old City Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.8667, "lng": 80.9 } },
  { "localityId": "LOC-LKO-037", "name": "Husainabad", "zoneId": "LKO-Z08", "zoneName": "Old City Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.872, "lng": 80.905 } },
  { "localityId": "LOC-LKO-038", "name": "Thakurganj", "zoneId": "LKO-Z08", "zoneName": "Old City Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.862, "lng": 80.892 } },
  { "localityId": "LOC-LKO-039", "name": "Saadatganj", "zoneId": "LKO-Z08", "zoneName": "Old City Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.855, "lng": 80.895 } },
  { "localityId": "LOC-LKO-040", "name": "Kashmiri Mohalla", "zoneId": "LKO-Z08", "zoneName": "Old City Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.858, "lng": 80.902 } },
  { "localityId": "LOC-LKO-041", "name": "Rajajipuram", "zoneId": "LKO-Z09", "zoneName": "West-Central Lucknow", "city": "Lucknow", "pinCode": "226017", "coordinates": { "lat": 26.85, "lng": 80.8833 } },
  { "localityId": "LOC-LKO-042", "name": "Talkatora", "zoneId": "LKO-Z09", "zoneName": "West-Central Lucknow", "city": "Lucknow", "pinCode": "226017", "coordinates": { "lat": 26.838, "lng": 80.895 } },
  { "localityId": "LOC-LKO-043", "name": "Alamnagar", "zoneId": "LKO-Z09", "zoneName": "West-Central Lucknow", "city": "Lucknow", "pinCode": "226017", "coordinates": { "lat": 26.845, "lng": 80.875 } },
  { "localityId": "LOC-LKO-044", "name": "Dubagga", "zoneId": "LKO-Z09", "zoneName": "West-Central Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.86, "lng": 80.865 } },
  { "localityId": "LOC-LKO-045", "name": "Campbell Road", "zoneId": "LKO-Z09", "zoneName": "West-Central Lucknow", "city": "Lucknow", "pinCode": "226003", "coordinates": { "lat": 26.856, "lng": 80.879 } },
  { "localityId": "LOC-LKO-046", "name": "Alambagh", "zoneId": "LKO-Z10", "zoneName": "South-West Lucknow", "city": "Lucknow", "pinCode": "226005", "coordinates": { "lat": 26.8167, "lng": 80.9 } },
  { "localityId": "LOC-LKO-047", "name": "Singar Nagar", "zoneId": "LKO-Z10", "zoneName": "South-West Lucknow", "city": "Lucknow", "pinCode": "226005", "coordinates": { "lat": 26.82, "lng": 80.895 } },
  { "localityId": "LOC-LKO-048", "name": "Krishna Nagar", "zoneId": "LKO-Z10", "zoneName": "South-West Lucknow", "city": "Lucknow", "pinCode": "226023", "coordinates": { "lat": 26.808, "lng": 80.89 } },
  { "localityId": "LOC-LKO-049", "name": "Transport Nagar", "zoneId": "LKO-Z10", "zoneName": "South-West Lucknow", "city": "Lucknow", "pinCode": "226012", "coordinates": { "lat": 26.795, "lng": 80.885 } },
  { "localityId": "LOC-LKO-050", "name": "Mawaiya", "zoneId": "LKO-Z10", "zoneName": "South-West Lucknow", "city": "Lucknow", "pinCode": "226005", "coordinates": { "lat": 26.828, "lng": 80.91 } },
  { "localityId": "LOC-LKO-051", "name": "Ashiyana", "zoneId": "LKO-Z11", "zoneName": "South Lucknow", "city": "Lucknow", "pinCode": "226012", "coordinates": { "lat": 26.7833, "lng": 80.9167 } },
  { "localityId": "LOC-LKO-052", "name": "South City", "zoneId": "LKO-Z11", "zoneName": "South Lucknow", "city": "Lucknow", "pinCode": "226025", "coordinates": { "lat": 26.772, "lng": 80.93 } },
  { "localityId": "LOC-LKO-053", "name": "Ruchi Khand", "zoneId": "LKO-Z11", "zoneName": "South Lucknow", "city": "Lucknow", "pinCode": "226012", "coordinates": { "lat": 26.785, "lng": 80.912 } },
  { "localityId": "LOC-LKO-054", "name": "Sector K Ashiyana", "zoneId": "LKO-Z11", "zoneName": "South Lucknow", "city": "Lucknow", "pinCode": "226012", "coordinates": { "lat": 26.78, "lng": 80.92 } },
  { "localityId": "LOC-LKO-055", "name": "Sharda Nagar", "zoneId": "LKO-Z11", "zoneName": "South Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.77, "lng": 80.925 } },
  { "localityId": "LOC-LKO-056", "name": "Sarojini Nagar", "zoneId": "LKO-Z12", "zoneName": "Far South-West Lucknow", "city": "Lucknow", "pinCode": "226008", "coordinates": { "lat": 26.75, "lng": 80.8667 } },
  { "localityId": "LOC-LKO-057", "name": "Amausi", "zoneId": "LKO-Z12", "zoneName": "Far South-West Lucknow", "city": "Lucknow", "pinCode": "226008", "coordinates": { "lat": 26.765, "lng": 80.88 } },
  { "localityId": "LOC-LKO-058", "name": "Airport Zone", "zoneId": "LKO-Z12", "zoneName": "Far South-West Lucknow", "city": "Lucknow", "pinCode": "226009", "coordinates": { "lat": 26.76, "lng": 80.885 } },
  { "localityId": "LOC-LKO-059", "name": "Nadarganj", "zoneId": "LKO-Z12", "zoneName": "Far South-West Lucknow", "city": "Lucknow", "pinCode": "226008", "coordinates": { "lat": 26.755, "lng": 80.875 } },
  { "localityId": "LOC-LKO-060", "name": "Piparsand", "zoneId": "LKO-Z12", "zoneName": "Far South-West Lucknow", "city": "Lucknow", "pinCode": "226008", "coordinates": { "lat": 26.74, "lng": 80.855 } },
  { "localityId": "LOC-LKO-061", "name": "Telibagh", "zoneId": "LKO-Z13", "zoneName": "South-Central Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.7833, "lng": 80.95 } },
  { "localityId": "LOC-LKO-062", "name": "Vrindavan Yojna", "zoneId": "LKO-Z13", "zoneName": "South-Central Lucknow", "city": "Lucknow", "pinCode": "226029", "coordinates": { "lat": 26.775, "lng": 80.96 } },
  { "localityId": "LOC-LKO-063", "name": "Kharika", "zoneId": "LKO-Z13", "zoneName": "South-Central Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.788, "lng": 80.945 } },
  { "localityId": "LOC-LKO-064", "name": "Sainik Nagar", "zoneId": "LKO-Z13", "zoneName": "South-Central Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.795, "lng": 80.948 } },
  { "localityId": "LOC-LKO-065", "name": "Eldeco", "zoneId": "LKO-Z13", "zoneName": "South-Central Lucknow", "city": "Lucknow", "pinCode": "226025", "coordinates": { "lat": 26.778, "lng": 80.938 } },
  { "localityId": "LOC-LKO-066", "name": "Sushant Golf City", "zoneId": "LKO-Z14", "zoneName": "South-East Lucknow", "city": "Lucknow", "pinCode": "226030", "coordinates": { "lat": 26.78, "lng": 81.01 } },
  { "localityId": "LOC-LKO-067", "name": "Ahmamau", "zoneId": "LKO-Z14", "zoneName": "South-East Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.792, "lng": 81.005 } },
  { "localityId": "LOC-LKO-068", "name": "Arjunganj", "zoneId": "LKO-Z14", "zoneName": "South-East Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.81, "lng": 80.985 } },
  { "localityId": "LOC-LKO-069", "name": "Shaheed Path", "zoneId": "LKO-Z14", "zoneName": "South-East Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.8, "lng": 81.0 } },
  { "localityId": "LOC-LKO-070", "name": "Sultanpur Road", "zoneId": "LKO-Z14", "zoneName": "South-East Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.785, "lng": 81.02 } },
  { "localityId": "LOC-LKO-071", "name": "Bakshi Ka Talab", "zoneId": "LKO-Z15", "zoneName": "Far North Lucknow", "city": "Lucknow", "pinCode": "226201", "coordinates": { "lat": 27.0, "lng": 80.9167 } },
  { "localityId": "LOC-LKO-072", "name": "Bargadi Magath", "zoneId": "LKO-Z15", "zoneName": "Far North Lucknow", "city": "Lucknow", "pinCode": "226201", "coordinates": { "lat": 27.015, "lng": 80.92 } },
  { "localityId": "LOC-LKO-073", "name": "Kathaura", "zoneId": "LKO-Z15", "zoneName": "Far North Lucknow", "city": "Lucknow", "pinCode": "226201", "coordinates": { "lat": 27.008, "lng": 80.905 } },
  { "localityId": "LOC-LKO-074", "name": "Kalyanpur North", "zoneId": "LKO-Z15", "zoneName": "Far North Lucknow", "city": "Lucknow", "pinCode": "226201", "coordinates": { "lat": 26.985, "lng": 80.925 } },
  { "localityId": "LOC-LKO-075", "name": "Madiyaon Extension", "zoneId": "LKO-Z15", "zoneName": "Far North Lucknow", "city": "Lucknow", "pinCode": "226201", "coordinates": { "lat": 26.975, "lng": 80.918 } },
  { "localityId": "LOC-LKO-076", "name": "Chinhat", "zoneId": "LKO-Z16", "zoneName": "Far East Lucknow", "city": "Lucknow", "pinCode": "226028", "coordinates": { "lat": 26.8833, "lng": 81.05 } },
  { "localityId": "LOC-LKO-077", "name": "Matiyari", "zoneId": "LKO-Z16", "zoneName": "Far East Lucknow", "city": "Lucknow", "pinCode": "226028", "coordinates": { "lat": 26.89, "lng": 81.045 } },
  { "localityId": "LOC-LKO-078", "name": "Kamta", "zoneId": "LKO-Z16", "zoneName": "Far East Lucknow", "city": "Lucknow", "pinCode": "226028", "coordinates": { "lat": 26.875, "lng": 81.035 } },
  { "localityId": "LOC-LKO-079", "name": "Deva Road", "zoneId": "LKO-Z16", "zoneName": "Far East Lucknow", "city": "Lucknow", "pinCode": "226028", "coordinates": { "lat": 26.895, "lng": 81.06 } },
  { "localityId": "LOC-LKO-080", "name": "Anora Kala", "zoneId": "LKO-Z16", "zoneName": "Far East Lucknow", "city": "Lucknow", "pinCode": "226028", "coordinates": { "lat": 26.888, "lng": 81.065 } },
  { "localityId": "LOC-LKO-081", "name": "Kakori", "zoneId": "LKO-Z17", "zoneName": "Far West Lucknow", "city": "Lucknow", "pinCode": "226101", "coordinates": { "lat": 26.8833, "lng": 80.8 } },
  { "localityId": "LOC-LKO-082", "name": "Malihabad Road", "zoneId": "LKO-Z17", "zoneName": "Far West Lucknow", "city": "Lucknow", "pinCode": "226102", "coordinates": { "lat": 26.895, "lng": 80.81 } },
  { "localityId": "LOC-LKO-083", "name": "Mohan Road", "zoneId": "LKO-Z17", "zoneName": "Far West Lucknow", "city": "Lucknow", "pinCode": "226017", "coordinates": { "lat": 26.87, "lng": 80.825 } },
  { "localityId": "LOC-LKO-084", "name": "Jehta", "zoneId": "LKO-Z17", "zoneName": "Far West Lucknow", "city": "Lucknow", "pinCode": "226101", "coordinates": { "lat": 26.9, "lng": 80.79 } },
  { "localityId": "LOC-LKO-085", "name": "Banthra Road", "zoneId": "LKO-Z17", "zoneName": "Far West Lucknow", "city": "Lucknow", "pinCode": "226401", "coordinates": { "lat": 26.865, "lng": 80.785 } },
  { "localityId": "LOC-LKO-086", "name": "Charbagh", "zoneId": "LKO-Z18", "zoneName": "Inner-Central Lucknow", "city": "Lucknow", "pinCode": "226004", "coordinates": { "lat": 26.8333, "lng": 80.9167 } },
  { "localityId": "LOC-LKO-087", "name": "Cantonment", "zoneId": "LKO-Z18", "zoneName": "Inner-Central Lucknow", "city": "Lucknow", "pinCode": "226002", "coordinates": { "lat": 26.825, "lng": 80.94 } },
  { "localityId": "LOC-LKO-088", "name": "Hussainganj", "zoneId": "LKO-Z18", "zoneName": "Inner-Central Lucknow", "city": "Lucknow", "pinCode": "226001", "coordinates": { "lat": 26.838, "lng": 80.93 } },
  { "localityId": "LOC-LKO-089", "name": "Naka Hindola", "zoneId": "LKO-Z18", "zoneName": "Inner-Central Lucknow", "city": "Lucknow", "pinCode": "226004", "coordinates": { "lat": 26.836, "lng": 80.922 } },
  { "localityId": "LOC-LKO-090", "name": "Aishbagh", "zoneId": "LKO-Z18", "zoneName": "Inner-Central Lucknow", "city": "Lucknow", "pinCode": "226004", "coordinates": { "lat": 26.841, "lng": 80.912 } }
];

/**
 * Calculates Haversine distance in km between two lat/lng points
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Computes live coverage across all 90 canonical Lucknow localities from a base marker
 */
export function computeCanonicalCoverage(
  baseLat: number,
  baseLng: number,
  radiusKm: number,
  excludedIds: Set<string> = new Set()
) {
  const zoneMap = new Map<string, {
    zoneId: string;
    zoneName: string;
    centerArea: string;
    city: string;
    coordinates: { lat: number; lng: number };
    totalCount: number;
    withinRadiusCount: number;
    selectedCount: number;
    localities: Array<{
      localityId: string;
      name: string;
      pinCode?: string;
      coordinates: { lat: number; lng: number };
      distanceKm: number;
      isWithinRadius: boolean;
      isSelected: boolean;
      isExcluded: boolean;
    }>;
  }>();

  CANONICAL_ZONES.forEach((z) => {
    zoneMap.set(z.zoneId, {
      zoneId: z.zoneId,
      zoneName: z.zoneName,
      centerArea: z.centerArea,
      city: z.city || 'Lucknow',
      coordinates: z.coordinates,
      totalCount: 0,
      withinRadiusCount: 0,
      selectedCount: 0,
      localities: []
    });
  });

  let totalWithinRadius = 0;
  let selectedCount = 0;
  const coveredZones = new Set<string>();

  CANONICAL_LOCALITIES.forEach((loc) => {
    const dist = calculateDistanceKm(baseLat, baseLng, loc.coordinates.lat, loc.coordinates.lng);
    const isWithinRadius = dist <= radiusKm;
    const isExcluded = excludedIds.has(loc.localityId);
    const isSelected = isWithinRadius && !isExcluded;

    if (isWithinRadius) {
      totalWithinRadius++;
      if (isSelected) {
        selectedCount++;
        coveredZones.add(loc.zoneId);
      }
    }

    const z = zoneMap.get(loc.zoneId);
    if (z) {
      z.localities.push({
        localityId: loc.localityId,
        name: loc.name,
        pinCode: loc.pinCode,
        coordinates: loc.coordinates,
        distanceKm: dist,
        isWithinRadius,
        isSelected,
        isExcluded
      });
      z.totalCount++;
      if (isWithinRadius) z.withinRadiusCount++;
      if (isSelected) z.selectedCount++;
    }
  });

  return {
    totalLocalities: CANONICAL_LOCALITIES.length,
    totalWithinRadius,
    selectedCount,
    excludedCount: excludedIds.size,
    zonesCoveredCount: coveredZones.size,
    zones: Array.from(zoneMap.values())
  };
}

/**
 * Finds the nearest canonical Lucknow locality to a given lat/lng point
 */
export function findNearestLocality(lat: number, lng: number) {
  let minDistance = Infinity;
  let closestLoc: LocalityItem = CANONICAL_LOCALITIES[0];

  for (const loc of CANONICAL_LOCALITIES) {
    const d = calculateDistanceKm(lat, lng, loc.coordinates.lat, loc.coordinates.lng);
    if (d < minDistance) {
      minDistance = d;
      closestLoc = loc;
    }
  }

  return {
    locality: closestLoc.name,
    city: closestLoc.city || 'Lucknow',
    pinCode: closestLoc.pinCode || '226001',
    zoneId: closestLoc.zoneId,
    zoneName: closestLoc.zoneName,
    address: `${closestLoc.name}, Lucknow, Uttar Pradesh ${closestLoc.pinCode || '226001'}`,
    distanceKm: minDistance
  };
}

