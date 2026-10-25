// 18 Service Zones & 90 Canonical Localities from Division_zone_wise.xlsx
export interface ZoneItem {
  zoneId: string;
  zoneName: string;
  centerArea: string;
  radiusKm: number;
  coordinates: { lat: number; lng: number };
}

export interface LocalityItem {
  localityId: string;
  name: string;
  zoneId: string;
  zoneName: string;
  city: string;
  coordinates: { lat: number; lng: number };
}

export const CANONICAL_ZONES: ZoneItem[] = [
  {
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "centerArea": "Gomti Nagar",
    "radiusKm": 7,
    "coordinates": {
      "lat": 26.85,
      "lng": 80.9984
    }
  },
  {
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "centerArea": "Indira Nagar",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.8833,
      "lng": 80.9833
    }
  },
  {
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "centerArea": "Mahanagar",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.875,
      "lng": 80.95
    }
  },
  {
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "centerArea": "Aliganj",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.8833,
      "lng": 80.9333
    }
  },
  {
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "centerArea": "Jankipuram",
    "radiusKm": 6,
    "coordinates": {
      "lat": 26.9167,
      "lng": 80.9333
    }
  },
  {
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "centerArea": "Vikas Nagar",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.89,
      "lng": 80.96
    }
  },
  {
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "centerArea": "Hazratganj",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.8467,
      "lng": 80.9462
    }
  },
  {
    "zoneId": "LKO-Z08",
    "zoneName": "Old Lucknow",
    "centerArea": "Chowk",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.8667,
      "lng": 80.9
    }
  },
  {
    "zoneId": "LKO-Z09",
    "zoneName": "West Lucknow",
    "centerArea": "Rajajipuram",
    "radiusKm": 6,
    "coordinates": {
      "lat": 26.8333,
      "lng": 80.8833
    }
  },
  {
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "centerArea": "Alambagh",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.8167,
      "lng": 80.9
    }
  },
  {
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "centerArea": "Ashiyana",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.79,
      "lng": 80.91
    }
  },
  {
    "zoneId": "LKO-Z12",
    "zoneName": "South-East Lucknow",
    "centerArea": "PGI / Telibagh",
    "radiusKm": 6,
    "coordinates": {
      "lat": 26.775,
      "lng": 80.945
    }
  },
  {
    "zoneId": "LKO-Z13",
    "zoneName": "Far South-East Lucknow",
    "centerArea": "Sushant Golf City",
    "radiusKm": 7,
    "coordinates": {
      "lat": 26.78,
      "lng": 81.01
    }
  },
  {
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Outer",
    "centerArea": "Sarojini Nagar",
    "radiusKm": 7,
    "coordinates": {
      "lat": 26.75,
      "lng": 80.865
    }
  },
  {
    "zoneId": "LKO-Z15",
    "zoneName": "West Outer",
    "centerArea": "Dubagga",
    "radiusKm": 6,
    "coordinates": {
      "lat": 26.865,
      "lng": 80.845
    }
  },
  {
    "zoneId": "LKO-Z16",
    "zoneName": "North Outer",
    "centerArea": "Faizullaganj",
    "radiusKm": 6,
    "coordinates": {
      "lat": 26.905,
      "lng": 80.91
    }
  },
  {
    "zoneId": "LKO-Z17",
    "zoneName": "East Outer",
    "centerArea": "Chinhat",
    "radiusKm": 6,
    "coordinates": {
      "lat": 26.875,
      "lng": 81.045
    }
  },
  {
    "zoneId": "LKO-Z18",
    "zoneName": "Central-South",
    "centerArea": "Charbagh / Cantt",
    "radiusKm": 5,
    "coordinates": {
      "lat": 26.832,
      "lng": 80.925
    }
  }
];

export const CANONICAL_LOCALITIES: LocalityItem[] = [
  {
    "localityId": "LOC-LKO-001",
    "name": "Gomti Nagar",
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.85,
      "lng": 80.9984
    }
  },
  {
    "localityId": "LOC-LKO-002",
    "name": "Vibhuti Khand",
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8647,
      "lng": 81.0062
    }
  },
  {
    "localityId": "LOC-LKO-003",
    "name": "Viram Khand",
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.853,
      "lng": 81.002
    }
  },
  {
    "localityId": "LOC-LKO-004",
    "name": "Vineet Khand",
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.848,
      "lng": 81.008
    }
  },
  {
    "localityId": "LOC-LKO-005",
    "name": "Vinay Khand",
    "zoneId": "LKO-Z01",
    "zoneName": "East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.842,
      "lng": 81.005
    }
  },
  {
    "localityId": "LOC-LKO-006",
    "name": "Indira Nagar",
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8833,
      "lng": 80.9833
    }
  },
  {
    "localityId": "LOC-LKO-007",
    "name": "Munshipulia",
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.889,
      "lng": 80.989
    }
  },
  {
    "localityId": "LOC-LKO-008",
    "name": "Bhootnath",
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.877,
      "lng": 80.979
    }
  },
  {
    "localityId": "LOC-LKO-009",
    "name": "Ismailganj",
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.892,
      "lng": 80.995
    }
  },
  {
    "localityId": "LOC-LKO-010",
    "name": "Faizabad Road",
    "zoneId": "LKO-Z02",
    "zoneName": "East-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.879,
      "lng": 81.01
    }
  },
  {
    "localityId": "LOC-LKO-011",
    "name": "Mahanagar",
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.875,
      "lng": 80.95
    }
  },
  {
    "localityId": "LOC-LKO-012",
    "name": "Nishatganj",
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.862,
      "lng": 80.956
    }
  },
  {
    "localityId": "LOC-LKO-013",
    "name": "Daliganj",
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.868,
      "lng": 80.938
    }
  },
  {
    "localityId": "LOC-LKO-014",
    "name": "New Hyderabad",
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.865,
      "lng": 80.948
    }
  },
  {
    "localityId": "LOC-LKO-015",
    "name": "Niralanagar",
    "zoneId": "LKO-Z03",
    "zoneName": "North-Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.879,
      "lng": 80.942
    }
  },
  {
    "localityId": "LOC-LKO-016",
    "name": "Aliganj",
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8833,
      "lng": 80.9333
    }
  },
  {
    "localityId": "LOC-LKO-017",
    "name": "Kapoorthala",
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.878,
      "lng": 80.938
    }
  },
  {
    "localityId": "LOC-LKO-018",
    "name": "Chandganj",
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.872,
      "lng": 80.936
    }
  },
  {
    "localityId": "LOC-LKO-019",
    "name": "Kursi Road",
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.905,
      "lng": 80.942
    }
  },
  {
    "localityId": "LOC-LKO-020",
    "name": "Triveni Nagar",
    "zoneId": "LKO-Z04",
    "zoneName": "North Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.892,
      "lng": 80.925
    }
  },
  {
    "localityId": "LOC-LKO-021",
    "name": "Jankipuram",
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.9167,
      "lng": 80.9333
    }
  },
  {
    "localityId": "LOC-LKO-022",
    "name": "Gudamba",
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.925,
      "lng": 80.95
    }
  },
  {
    "localityId": "LOC-LKO-023",
    "name": "IIM Road",
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.932,
      "lng": 80.915
    }
  },
  {
    "localityId": "LOC-LKO-024",
    "name": "Kalyanpur",
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.908,
      "lng": 80.952
    }
  },
  {
    "localityId": "LOC-LKO-025",
    "name": "Madiyaon",
    "zoneId": "LKO-Z05",
    "zoneName": "North-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.912,
      "lng": 80.928
    }
  },
  {
    "localityId": "LOC-LKO-026",
    "name": "Vikas Nagar",
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.89,
      "lng": 80.96
    }
  },
  {
    "localityId": "LOC-LKO-027",
    "name": "Khurram Nagar",
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.887,
      "lng": 80.968
    }
  },
  {
    "localityId": "LOC-LKO-028",
    "name": "Tedhi Puliya",
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.902,
      "lng": 80.955
    }
  },
  {
    "localityId": "LOC-LKO-029",
    "name": "Engineering College",
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.915,
      "lng": 80.942
    }
  },
  {
    "localityId": "LOC-LKO-030",
    "name": "Vikas Nagar Extension",
    "zoneId": "LKO-Z06",
    "zoneName": "North-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.895,
      "lng": 80.965
    }
  },
  {
    "localityId": "LOC-LKO-031",
    "name": "Hazratganj",
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8467,
      "lng": 80.9462
    }
  },
  {
    "localityId": "LOC-LKO-032",
    "name": "Lalbagh",
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.843,
      "lng": 80.94
    }
  },
  {
    "localityId": "LOC-LKO-033",
    "name": "Narhi",
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.849,
      "lng": 80.952
    }
  },
  {
    "localityId": "LOC-LKO-034",
    "name": "Butler Colony",
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.855,
      "lng": 80.958
    }
  },
  {
    "localityId": "LOC-LKO-035",
    "name": "Civil Lines",
    "zoneId": "LKO-Z07",
    "zoneName": "Central Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.841,
      "lng": 80.949
    }
  },
  {
    "localityId": "LOC-LKO-036",
    "name": "Chowk",
    "zoneId": "LKO-Z08",
    "zoneName": "Old Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8667,
      "lng": 80.9
    }
  },
  {
    "localityId": "LOC-LKO-037",
    "name": "Husainabad",
    "zoneId": "LKO-Z08",
    "zoneName": "Old Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.872,
      "lng": 80.912
    }
  },
  {
    "localityId": "LOC-LKO-038",
    "name": "Thakurganj",
    "zoneId": "LKO-Z08",
    "zoneName": "Old Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.86,
      "lng": 80.892
    }
  },
  {
    "localityId": "LOC-LKO-039",
    "name": "Balaganj",
    "zoneId": "LKO-Z08",
    "zoneName": "Old Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.868,
      "lng": 80.885
    }
  },
  {
    "localityId": "LOC-LKO-040",
    "name": "Saadatganj",
    "zoneId": "LKO-Z08",
    "zoneName": "Old Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.852,
      "lng": 80.895
    }
  },
  {
    "localityId": "LOC-LKO-041",
    "name": "Rajajipuram",
    "zoneId": "LKO-Z09",
    "zoneName": "West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8333,
      "lng": 80.8833
    }
  },
  {
    "localityId": "LOC-LKO-042",
    "name": "Alamnagar",
    "zoneId": "LKO-Z09",
    "zoneName": "West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.838,
      "lng": 80.875
    }
  },
  {
    "localityId": "LOC-LKO-043",
    "name": "Talkatora",
    "zoneId": "LKO-Z09",
    "zoneName": "West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.828,
      "lng": 80.898
    }
  },
  {
    "localityId": "LOC-LKO-044",
    "name": "Para",
    "zoneId": "LKO-Z09",
    "zoneName": "West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.821,
      "lng": 80.865
    }
  },
  {
    "localityId": "LOC-LKO-045",
    "name": "Avas Vikas",
    "zoneId": "LKO-Z09",
    "zoneName": "West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.835,
      "lng": 80.887
    }
  },
  {
    "localityId": "LOC-LKO-046",
    "name": "Alambagh",
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.8167,
      "lng": 80.9
    }
  },
  {
    "localityId": "LOC-LKO-047",
    "name": "Krishna Nagar",
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.802,
      "lng": 80.892
    }
  },
  {
    "localityId": "LOC-LKO-048",
    "name": "Manak Nagar",
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.812,
      "lng": 80.885
    }
  },
  {
    "localityId": "LOC-LKO-049",
    "name": "Singar Nagar",
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.819,
      "lng": 80.908
    }
  },
  {
    "localityId": "LOC-LKO-050",
    "name": "Mawaiya",
    "zoneId": "LKO-Z10",
    "zoneName": "South-West Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.826,
      "lng": 80.912
    }
  },
  {
    "localityId": "LOC-LKO-051",
    "name": "Ashiyana",
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.79,
      "lng": 80.91
    }
  },
  {
    "localityId": "LOC-LKO-052",
    "name": "LDA Colony",
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.796,
      "lng": 80.905
    }
  },
  {
    "localityId": "LOC-LKO-053",
    "name": "Hind Nagar",
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.808,
      "lng": 80.902
    }
  },
  {
    "localityId": "LOC-LKO-054",
    "name": "Kanpur Road",
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.785,
      "lng": 80.895
    }
  },
  {
    "localityId": "LOC-LKO-055",
    "name": "Barauna",
    "zoneId": "LKO-Z11",
    "zoneName": "South Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.778,
      "lng": 80.918
    }
  },
  {
    "localityId": "LOC-LKO-056",
    "name": "Telibagh",
    "zoneId": "LKO-Z12",
    "zoneName": "South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.792,
      "lng": 80.94
    }
  },
  {
    "localityId": "LOC-LKO-057",
    "name": "PGI",
    "zoneId": "LKO-Z12",
    "zoneName": "South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.762,
      "lng": 80.948
    }
  },
  {
    "localityId": "LOC-LKO-058",
    "name": "Kharika",
    "zoneId": "LKO-Z12",
    "zoneName": "South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.782,
      "lng": 80.952
    }
  },
  {
    "localityId": "LOC-LKO-059",
    "name": "Eldeco",
    "zoneId": "LKO-Z12",
    "zoneName": "South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.788,
      "lng": 80.965
    }
  },
  {
    "localityId": "LOC-LKO-060",
    "name": "Raebareli Road",
    "zoneId": "LKO-Z12",
    "zoneName": "South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.755,
      "lng": 80.942
    }
  },
  {
    "localityId": "LOC-LKO-061",
    "name": "Sushant Golf City",
    "zoneId": "LKO-Z13",
    "zoneName": "Far South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.78,
      "lng": 81.01
    }
  },
  {
    "localityId": "LOC-LKO-062",
    "name": "Ahmamau",
    "zoneId": "LKO-Z13",
    "zoneName": "Far South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.795,
      "lng": 81.002
    }
  },
  {
    "localityId": "LOC-LKO-063",
    "name": "Arjunganj",
    "zoneId": "LKO-Z13",
    "zoneName": "Far South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.815,
      "lng": 80.985
    }
  },
  {
    "localityId": "LOC-LKO-064",
    "name": "Shaheed Path",
    "zoneId": "LKO-Z13",
    "zoneName": "Far South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.805,
      "lng": 81.015
    }
  },
  {
    "localityId": "LOC-LKO-065",
    "name": "Sultanpur Road",
    "zoneId": "LKO-Z13",
    "zoneName": "Far South-East Lucknow",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.772,
      "lng": 81.025
    }
  },
  {
    "localityId": "LOC-LKO-066",
    "name": "Sarojini Nagar",
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.75,
      "lng": 80.865
    }
  },
  {
    "localityId": "LOC-LKO-067",
    "name": "Amausi",
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.765,
      "lng": 80.878
    }
  },
  {
    "localityId": "LOC-LKO-068",
    "name": "Airport",
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.76,
      "lng": 80.882
    }
  },
  {
    "localityId": "LOC-LKO-069",
    "name": "Bijnaur",
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.732,
      "lng": 80.892
    }
  },
  {
    "localityId": "LOC-LKO-070",
    "name": "Bijnor Road",
    "zoneId": "LKO-Z14",
    "zoneName": "South-East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.745,
      "lng": 80.885
    }
  },
  {
    "localityId": "LOC-LKO-071",
    "name": "Dubagga",
    "zoneId": "LKO-Z15",
    "zoneName": "West Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.865,
      "lng": 80.845
    }
  },
  {
    "localityId": "LOC-LKO-072",
    "name": "Hardoi Road",
    "zoneId": "LKO-Z15",
    "zoneName": "West Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.872,
      "lng": 80.835
    }
  },
  {
    "localityId": "LOC-LKO-073",
    "name": "Mohan Road",
    "zoneId": "LKO-Z15",
    "zoneName": "West Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.852,
      "lng": 80.842
    }
  },
  {
    "localityId": "LOC-LKO-074",
    "name": "Kakori Road",
    "zoneId": "LKO-Z15",
    "zoneName": "West Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.882,
      "lng": 80.825
    }
  },
  {
    "localityId": "LOC-LKO-075",
    "name": "Balaganj Extension",
    "zoneId": "LKO-Z15",
    "zoneName": "West Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.868,
      "lng": 80.865
    }
  },
  {
    "localityId": "LOC-LKO-076",
    "name": "Faizullaganj",
    "zoneId": "LKO-Z16",
    "zoneName": "North Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.905,
      "lng": 80.91
    }
  },
  {
    "localityId": "LOC-LKO-077",
    "name": "Sitapur Road",
    "zoneId": "LKO-Z16",
    "zoneName": "North Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.918,
      "lng": 80.918
    }
  },
  {
    "localityId": "LOC-LKO-078",
    "name": "Mohan Road North",
    "zoneId": "LKO-Z16",
    "zoneName": "North Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.925,
      "lng": 80.895
    }
  },
  {
    "localityId": "LOC-LKO-079",
    "name": "Kalyanpur North",
    "zoneId": "LKO-Z16",
    "zoneName": "North Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.912,
      "lng": 80.935
    }
  },
  {
    "localityId": "LOC-LKO-080",
    "name": "Madiyaon Extension",
    "zoneId": "LKO-Z16",
    "zoneName": "North Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.908,
      "lng": 80.922
    }
  },
  {
    "localityId": "LOC-LKO-081",
    "name": "Chinhat",
    "zoneId": "LKO-Z17",
    "zoneName": "East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.875,
      "lng": 81.045
    }
  },
  {
    "localityId": "LOC-LKO-082",
    "name": "Matiyari",
    "zoneId": "LKO-Z17",
    "zoneName": "East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.882,
      "lng": 81.055
    }
  },
  {
    "localityId": "LOC-LKO-083",
    "name": "Kamta",
    "zoneId": "LKO-Z17",
    "zoneName": "East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.868,
      "lng": 81.032
    }
  },
  {
    "localityId": "LOC-LKO-084",
    "name": "Deva Road",
    "zoneId": "LKO-Z17",
    "zoneName": "East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.892,
      "lng": 81.048
    }
  },
  {
    "localityId": "LOC-LKO-085",
    "name": "Anora Kala",
    "zoneId": "LKO-Z17",
    "zoneName": "East Outer",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.879,
      "lng": 81.062
    }
  },
  {
    "localityId": "LOC-LKO-086",
    "name": "Charbagh",
    "zoneId": "LKO-Z18",
    "zoneName": "Central-South",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.83,
      "lng": 80.923
    }
  },
  {
    "localityId": "LOC-LKO-087",
    "name": "Cantonment",
    "zoneId": "LKO-Z18",
    "zoneName": "Central-South",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.825,
      "lng": 80.955
    }
  },
  {
    "localityId": "LOC-LKO-088",
    "name": "Hussainganj",
    "zoneId": "LKO-Z18",
    "zoneName": "Central-South",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.838,
      "lng": 80.935
    }
  },
  {
    "localityId": "LOC-LKO-089",
    "name": "Naka Hindola",
    "zoneId": "LKO-Z18",
    "zoneName": "Central-South",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.836,
      "lng": 80.918
    }
  },
  {
    "localityId": "LOC-LKO-090",
    "name": "Aishbagh",
    "zoneId": "LKO-Z18",
    "zoneName": "Central-South",
    "city": "Lucknow",
    "coordinates": {
      "lat": 26.841,
      "lng": 80.908
    }
  }
];
