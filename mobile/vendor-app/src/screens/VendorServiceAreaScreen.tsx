import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { computeCanonicalCoverage, findNearestLocality } from '../constants/zonesData';


interface LocalityItem {
  localityId: string;
  name: string;
  pinCode?: string;
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  isWithinRadius: boolean;
  isSelected: boolean;
  isExcluded: boolean;
}

interface ZoneItem {
  zoneId: string;
  zoneName: string;
  centerArea: string;
  city: string;
  coordinates: { lat: number; lng: number };
  totalCount: number;
  withinRadiusCount: number;
  selectedCount: number;
  localities: LocalityItem[];
}

export default function VendorServiceAreaScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const webviewRef = useRef<WebView>(null);

  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  // Core Geographic States
  const [coordinates, setCoordinates] = useState({ lat: 26.8467, lng: 80.9462 });
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [serviceLocation, setServiceLocation] = useState('Hazratganj, Lucknow');
  const [pincode, setPincode] = useState('226001');

  // Exclusion & Grouping States
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [expandedZones, setExpandedZones] = useState<{ [zoneId: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editLocModalOpen, setEditLocModalOpen] = useState(false);
  const [tempLocInput, setTempLocInput] = useState('');

  // Request deduplication, debouncing & cancellation refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCoverageParamsRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Fetch dynamic coverage with automatic canonical fallback and AbortController cancellation
  const fetchDynamicCoverage = useCallback(async (
    lat: number,
    lng: number,
    radius: number,
    currentExcluded: Set<string>
  ) => {
    // Deduplicate: If base location and radius have not changed, only update local exclusions
    const last = lastCoverageParamsRef.current;
    if (last && Math.abs(last.lat - lat) < 0.0001 && Math.abs(last.lng - lng) < 0.0001 && last.radius === radius) {
      setZones((prevZones) =>
        prevZones.map((z) => ({
          ...z,
          localities: z.localities.map((loc) => {
            const isExcluded = currentExcluded.has(loc.localityId);
            return {
              ...loc,
              isExcluded,
              isSelected: loc.isWithinRadius && !isExcluded
            };
          }),
          withinRadiusCount: z.localities.filter((l) => l.isWithinRadius).length,
          selectedCount: z.localities.filter((l) => l.isWithinRadius && !currentExcluded.has(l.localityId)).length
        }))
      );
      return;
    }

    // Cancel in-flight coverage request to avoid request storms & stale state
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastCoverageParamsRef.current = { lat, lng, radius };

    try {
      setCoverageError(null);
      const res = await api.zones.getCoverage(lat, lng, radius);
      if (controller.signal.aborted) return;

      if (res?.success && Array.isArray(res.zones) && res.zones.length > 0) {
        const updatedZones: ZoneItem[] = res.zones.map((z: any) => ({
          ...z,
          localities: z.localities.map((loc: any) => {
            const isExcluded = currentExcluded.has(loc.localityId);
            return {
              ...loc,
              isExcluded,
              isSelected: loc.isWithinRadius && !isExcluded
            };
          }),
          withinRadiusCount: z.localities.filter((l: any) => l.isWithinRadius).length,
          selectedCount: z.localities.filter((l: any) => l.isWithinRadius && !currentExcluded.has(l.localityId)).length
        }));
        setZones(updatedZones);
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.log('[ServiceArea] API coverage call not reachable or error, computing canonical coverage:', err?.message || err);
    }

    if (controller.signal.aborted) return;

    // High-Resilience Fallback: Compute coverage from canonical 18 Lucknow zones & 90 localities
    try {
      const canonical = computeCanonicalCoverage(lat, lng, radius, currentExcluded);
      setZones(canonical.zones as ZoneItem[]);
    } catch (calcErr) {
      setCoverageError('Failed to compute locality coverage. Tap retry to reload.');
    }
  }, []);

  // Load Saved Service Area on Mount
  useEffect(() => {
    loadServiceArea();
  }, []);

  const loadServiceArea = useCallback(async () => {
    try {
      setLoading(true);
      setMapError(false);
      setCoverageError(null);

      let initialCoords = { lat: 26.8467, lng: 80.9462 };
      let initialRadius = 15;
      let initialLocation = 'Hazratganj, Lucknow';
      let initialPin = '226001';
      let initialExcluded = new Set<string>();
      let loadedFromBackend = false;

      try {
        const res = await api.vendors.getServiceArea();
        if (res?.success && res.serviceArea) {
          const sa = res.serviceArea;
          if (sa.coordinates?.lat && sa.coordinates?.lng) {
            initialCoords = {
              lat: Number(sa.coordinates.lat),
              lng: Number(sa.coordinates.lng)
            };
          }
          if (sa.radiusKm) initialRadius = sa.radiusKm;
          if (sa.baseAddress) initialLocation = sa.baseAddress;
          if (sa.pincode) initialPin = sa.pincode;
          if (Array.isArray(sa.excludedLocalityIds)) {
            initialExcluded = new Set<string>(sa.excludedLocalityIds);
          }

          setCoordinates(initialCoords);
          setRadiusKm(initialRadius);
          setServiceLocation(initialLocation);
          setPincode(initialPin);
          setExcludedIds(initialExcluded);

          if (res.coverage?.zones && res.coverage.zones.length > 0) {
            setZones(res.coverage.zones);
            const exp: { [zoneId: string]: boolean } = {};
            res.coverage.zones.slice(0, 3).forEach((z: ZoneItem) => {
              exp[z.zoneId] = true;
            });
            setExpandedZones(exp);
            loadedFromBackend = true;
          }
        }
      } catch (err: any) {
        if (err?.data?.requiresOnboarding || err?.data?.code === 'VENDOR_PROFILE_NOT_FOUND') {
          Alert.alert(
            'Vendor Profile Required',
            'Please complete your vendor profile before configuring your service territory.',
            [
              { text: 'Complete Profile', onPress: () => navigation.navigate('VendorEditProfile') },
              { text: 'Later', style: 'cancel' }
            ]
          );
          setLoading(false);
          return;
        }
        console.log('[ServiceArea] getServiceArea API call failed, trying profile fallback:', err?.message || err);
      }

      if (!loadedFromBackend) {
        try {
          const pRes = await api.vendors.getProfile();
          if (pRes?.vendor) {
            const v = pRes.vendor;
            if (v.coordinates?.lat && v.coordinates?.lng) {
              initialCoords = { lat: Number(v.coordinates.lat), lng: Number(v.coordinates.lng) };
            }
            if (v.vendorServiceRadiusKm) initialRadius = v.vendorServiceRadiusKm;
            if (v.locality || v.city) {
              initialLocation = `${v.locality || 'Hazratganj'}, ${v.city || 'Lucknow'}`;
            }
            setCoordinates(initialCoords);
            setRadiusKm(initialRadius);
            setServiceLocation(initialLocation);
          }
        } catch (fallbackErr) {
          console.log('[ServiceArea] getProfile fallback failed, using default Hazratganj coordinates');
        }

        await fetchDynamicCoverage(initialCoords.lat, initialCoords.lng, initialRadius, initialExcluded);
        const exp: { [zoneId: string]: boolean } = {};
        ['LKO-Z01', 'LKO-Z02', 'LKO-Z03'].forEach((zid) => { exp[zid] = true; });
        setExpandedZones(exp);
      }
    } catch (err: any) {
      console.warn('Failed to load service area:', err);
      setMapError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchDynamicCoverage, navigation]);

  // Handle marker drag or map tap from Leaflet WebView with 350ms debounce
  const handleMapMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setMapReady(true);
      } else if (data.type === 'LOCATION_CHANGED') {
        const newLat = Number(data.lat);
        const newLng = Number(data.lng);
        if (!isNaN(newLat) && !isNaN(newLng)) {
          setCoordinates({ lat: newLat, lng: newLng });

          // Debounce reverse geocoding and coverage fetch to prevent request storms
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(async () => {
            let resolvedAddress = `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
            let resolvedPin = pincode;
            try {
              const geoRes = await api.zones.reverseGeocode(newLat, newLng);
              if (geoRes?.success) {
                resolvedAddress = geoRes.address || `${geoRes.locality}, ${geoRes.city}`;
                resolvedPin = geoRes.pinCode || '226001';
              }
            } catch (geoErr) {
              const nearest = findNearestLocality(newLat, newLng);
              resolvedAddress = nearest.address;
              resolvedPin = nearest.pinCode;
            }

            setServiceLocation(resolvedAddress);
            setPincode(resolvedPin);

            // Refresh coverage around new coordinates
            fetchDynamicCoverage(newLat, newLng, radiusKm, excludedIds);
          }, 350);
        }
      }
    } catch (e) {
      console.warn('Map message parse error:', e);
    }
  }, [radiusKm, excludedIds, pincode, fetchDynamicCoverage]);

  // Radius change handler
  const handleSelectRadius = (newRadius: number) => {
    setRadiusKm(newRadius);

    // Update Leaflet circle smoothly via JS injection in meters
    if (mapReady) {
      webviewRef.current?.injectJavaScript(`window.updateRadius(${newRadius}); true;`);
    }

    // Refresh dynamic coverage with existing deliberate exclusions preserved
    fetchDynamicCoverage(coordinates.lat, coordinates.lng, newRadius, excludedIds);
  };


  // GPS Location Handler with strict confirmation
  const handleUseGPS = async () => {
    try {
      setLocatingGPS(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'WorkLogy needs location permission to detect your current operational base via GPS.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const gpsLat = loc.coords.latitude;
      const gpsLng = loc.coords.longitude;

      // Reverse geocode candidate GPS point
      let detectedAddress = `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`;
      let detectedPin = '226001';
      try {
        const geo = await api.zones.reverseGeocode(gpsLat, gpsLng);
        if (geo?.success) {
          detectedAddress = geo.address || `${geo.locality}, Lucknow`;
          detectedPin = geo.pinCode || '226001';
        }
      } catch (e) {
        const nearest = findNearestLocality(gpsLat, gpsLng);
        detectedAddress = nearest.address;
        detectedPin = nearest.pinCode;
      }

      // STRICT USER CONFIRMATION: Never silently replace saved location!
      Alert.alert(
        'Set Service Base via GPS? 📍',
        `Detected Location:\n${detectedAddress}\n\nWould you like to move your service base to this location?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update Base Location',
            onPress: async () => {
              setCoordinates({ lat: gpsLat, lng: gpsLng });
              setServiceLocation(detectedAddress);
              setPincode(detectedPin);

              // Update Leaflet map view
              webviewRef.current?.injectJavaScript(
                `window.updateCenter(${gpsLat}, ${gpsLng}); true;`
              );

              // Refresh coverage
              await fetchDynamicCoverage(gpsLat, gpsLng, radiusKm, excludedIds);
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Could not fetch current GPS coordinates.');
    } finally {
      setLocatingGPS(false);
    }
  };

  // Recenter map button
  const handleRecenterMap = () => {
    webviewRef.current?.injectJavaScript('window.recenter(); true;');
  };

  // Zoom controls
  const handleZoomIn = () => {
    webviewRef.current?.injectJavaScript('window.zoomIn(); true;');
  };

  const handleZoomOut = () => {
    webviewRef.current?.injectJavaScript('window.zoomOut(); true;');
  };

  // Locality toggle: include / exclude
  const handleToggleLocality = (localityId: string) => {
    const nextExcluded = new Set(excludedIds);
    if (nextExcluded.has(localityId)) {
      nextExcluded.delete(localityId); // Re-include
    } else {
      nextExcluded.add(localityId); // Exclude
    }
    setExcludedIds(nextExcluded);

    // Update zones view state
    setZones((prevZones) =>
      prevZones.map((z) => {
        const updatedLocalities = z.localities.map((loc) => {
          if (loc.localityId === localityId) {
            const isEx = nextExcluded.has(loc.localityId);
            return {
              ...loc,
              isExcluded: isEx,
              isSelected: loc.isWithinRadius && !isEx
            };
          }
          return loc;
        });
        return {
          ...z,
          localities: updatedLocalities,
          selectedCount: updatedLocalities.filter((l) => l.isWithinRadius && !nextExcluded.has(l.localityId)).length
        };
      })
    );
  };

  // Select all localities within current radius
  const handleSelectAllWithinRadius = () => {
    const nextExcluded = new Set(excludedIds);
    zones.forEach((z) => {
      z.localities.forEach((l) => {
        if (l.isWithinRadius) {
          nextExcluded.delete(l.localityId);
        }
      });
    });
    setExcludedIds(nextExcluded);

    setZones((prevZones) =>
      prevZones.map((z) => {
        const updatedLocalities = z.localities.map((l) => ({
          ...l,
          isExcluded: nextExcluded.has(l.localityId),
          isSelected: l.isWithinRadius && !nextExcluded.has(l.localityId)
        }));
        return {
          ...z,
          localities: updatedLocalities,
          selectedCount: updatedLocalities.filter((l) => l.isWithinRadius && !nextExcluded.has(l.localityId)).length
        };
      })
    );
  };

  // Deselect all localities within current radius
  const handleDeselectAllWithinRadius = () => {
    const nextExcluded = new Set(excludedIds);
    zones.forEach((z) => {
      z.localities.forEach((l) => {
        if (l.isWithinRadius) {
          nextExcluded.add(l.localityId);
        }
      });
    });
    setExcludedIds(nextExcluded);

    setZones((prevZones) =>
      prevZones.map((z) => {
        const updatedLocalities = z.localities.map((l) => ({
          ...l,
          isExcluded: nextExcluded.has(l.localityId),
          isSelected: false
        }));
        return {
          ...z,
          localities: updatedLocalities,
          selectedCount: 0
        };
      })
    );
  };

  // Toggle Zone Accordion Expand/Collapse
  const toggleZoneExpand = (zoneId: string) => {
    setExpandedZones((prev) => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  // Manual Base Address Edit Modal Save
  const handleSaveLocation = async () => {
    const trimmed = tempLocInput.trim();
    if (trimmed) {
      setServiceLocation(trimmed);
      // Attempt to resolve coordinates if user changed locality
      try {
        const res = await api.zones.reverseGeocode(coordinates.lat, coordinates.lng);
        if (res?.success) {
          setPincode(res.pinCode || pincode);
        }
      } catch (e) {
        // preserve existing
      }
    }
    setEditLocModalOpen(false);
  };

  // Save Service Territory to Backend
  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      const allActiveSelectedLocalityIds: string[] = [];
      const allActiveSelectedZoneIds = new Set<string>();

      zones.forEach((z) => {
        z.localities.forEach((l) => {
          if (l.isWithinRadius && !excludedIds.has(l.localityId)) {
            allActiveSelectedLocalityIds.push(l.localityId);
            allActiveSelectedZoneIds.add(z.zoneId);
          }
        });
      });

      const payload = {
        coordinates,
        radiusKm,
        baseAddress: serviceLocation,
        pincode,
        selectedLocalityIds: allActiveSelectedLocalityIds,
        excludedLocalityIds: Array.from(excludedIds),
        selectedZoneIds: Array.from(allActiveSelectedZoneIds)
      };

      let saved = false;
      try {
        const res = await api.vendors.updateServiceArea(payload);
        if (res?.success) {
          saved = true;
        }
      } catch (err: any) {
        console.log('[ServiceArea] updateServiceArea API failed, trying updateProfile fallback:', err?.message || err);
        try {
          await api.vendors.updateProfile({
            locality: serviceLocation.split(',')[0].trim(),
            vendorServiceRadiusKm: radiusKm,
            coordinates
          });
          saved = true;
        } catch (fallbackErr) {
          throw err;
        }
      }

      if (saved) {
        Alert.alert(
          'Service Territory Saved! 📍',
          `Your service area is set to ${radiusKm} km around ${serviceLocation}.\n\nMatching job leads and automated dispatch requests will now be routed based on your active coverage territory (${allActiveSelectedLocalityIds.length} localities across ${allActiveSelectedZoneIds.size} zones).`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error('Could not save service territory.');
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not save service area.');
    } finally {
      setSaving(false);
    }
  };

  // Compute overall counts
  const { totalWithinRadius, totalSelected, coveredZonesCount } = useMemo(() => {
    let withinRadius = 0;
    let selected = 0;
    const coveredZones = new Set<string>();

    zones.forEach((z) => {
      z.localities.forEach((l) => {
        if (l.isWithinRadius) {
          withinRadius++;
          if (!excludedIds.has(l.localityId)) {
            selected++;
            coveredZones.add(z.zoneId);
          }
        }
      });
    });

    return {
      totalWithinRadius: withinRadius,
      totalSelected: selected,
      coveredZonesCount: coveredZones.size
    };
  }, [zones, excludedIds]);

  // Filtered Zones for search
  const filteredZones = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return zones;

    return zones
      .map((z) => {
        const zoneMatch = z.zoneName.toLowerCase().includes(q);
        const matchedLocalities = z.localities.filter(
          (l) => l.name.toLowerCase().includes(q) || (l.pinCode && l.pinCode.includes(q))
        );

        if (zoneMatch || matchedLocalities.length > 0) {
          return {
            ...z,
            localities: zoneMatch ? z.localities : matchedLocalities
          };
        }
        return null;
      })
      .filter(Boolean) as ZoneItem[];
  }, [zones, searchQuery]);

  // Leaflet OSM HTML Template with interactive Pin, Radius Circle, and PostMessage Bridge
  const leafletHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background-color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .custom-vendor-pin {
      width: 32px;
      height: 32px;
      background: #06684F;
      border: 3px solid #FFFFFF;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .custom-vendor-pin-inner {
      width: 10px;
      height: 10px;
      background: #FFFFFF;
      border-radius: 50%;
      transform: rotate(45deg);
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255, 255, 255, 0.85) !important;
      padding: 2px 5px !important;
      border-radius: 4px;
    }
    .leaflet-control-zoom {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: true
      }).setView([${coordinates.lat}, ${coordinates.lng}], 12);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      var pinIcon = L.divIcon({
        className: 'custom-pin-wrap',
        html: '<div class="custom-vendor-pin"><div class="custom-vendor-pin-inner"></div></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      var marker = L.marker([${coordinates.lat}, ${coordinates.lng}], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      var circle = L.circle([${coordinates.lat}, ${coordinates.lng}], {
        radius: ${radiusKm * 1000},
        color: '#06684F',
        weight: 2,
        fillColor: '#10B981',
        fillOpacity: 0.16
      }).addTo(map);

      map.fitBounds(circle.getBounds(), { padding: [15, 15] });

      function notifyRN(lat, lng) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOCATION_CHANGED',
            lat: lat,
            lng: lng
          }));
        }
      }

      marker.on('dragend', function(e) {
        var pos = marker.getLatLng();
        circle.setLatLng(pos);
        notifyRN(pos.lat, pos.lng);
      });

      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        notifyRN(e.latlng.lat, e.latlng.lng);
      });

      window.updateRadius = function(newRadiusKm) {
        circle.setRadius(newRadiusKm * 1000);
        map.fitBounds(circle.getBounds(), { padding: [15, 15] });
      };

      window.updateCenter = function(lat, lng) {
        var pos = [lat, lng];
        marker.setLatLng(pos);
        circle.setLatLng(pos);
        map.setView(pos, map.getZoom());
        map.fitBounds(circle.getBounds(), { padding: [15, 15] });
      };

      window.recenter = function() {
        map.fitBounds(circle.getBounds(), { padding: [15, 15] });
      };

      window.zoomIn = function() {
        map.zoomIn();
      };

      window.zoomOut = function() {
        map.zoomOut();
      };

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    } catch (err) {
      console.error(err);
    }
  </script>
</body>
</html>
    `;
  }, [coordinates.lat, coordinates.lng, radiusKm]);

  return (
    <View style={styles.screenWrapper}>
      {/* ── TOP HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Area</Text>
        <TouchableOpacity
          style={styles.headerGpsBtn}
          onPress={handleUseGPS}
          disabled={locatingGPS}
          activeOpacity={0.7}
        >
          {locatingGPS ? (
            <ActivityIndicator size="small" color="#06684F" />
          ) : (
            <Ionicons name="locate" size={20} color="#06684F" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={styles.loadingText}>Loading canonical territory & coverage...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── INTERACTIVE OPENSTREETMAP CONTAINER ── */}
          <View style={styles.mapContainerCard}>
            {mapError ? (
              <View style={styles.mapErrorFallback}>
                <Ionicons name="cloud-offline-outline" size={36} color="#94A3B8" />
                <Text style={styles.mapErrorText}>Could not connect to map tiles</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadServiceArea}>
                  <Text style={styles.retryBtnText}>Retry Map</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.webviewContainer}>
                <WebView
                  ref={webviewRef}
                  source={{ html: leafletHtml }}
                  style={styles.webview}
                  onMessage={handleMapMessage}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.webviewLoading}>
                      <ActivityIndicator size="small" color="#06684F" />
                      <Text style={styles.webviewLoadingText}>Loading OpenStreetMap...</Text>
                    </View>
                  )}
                  onError={() => setMapError(true)}
                  scrollEnabled={false}
                />

                {/* Map Floating Control Overlay */}
                <View style={styles.mapControlsOverlay}>
                  {/* Zoom Controls */}
                  <View style={styles.zoomControlsBox}>
                    <TouchableOpacity
                      style={styles.zoomBtn}
                      onPress={handleZoomIn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity
                      style={styles.zoomBtn}
                      onPress={handleZoomOut}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

                  {/* Recenter Button */}
                  <TouchableOpacity
                    style={styles.recenterBtn}
                    onPress={handleRecenterMap}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="scan" size={18} color="#06684F" />
                  </TouchableOpacity>
                </View>

                {/* Bottom Map Badge Overlay */}
                <View style={styles.mapBottomBar}>
                  <View style={styles.mapCoordsBadge}>
                    <Text style={styles.mapCoordsText}>
                      {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)} • {radiusKm} km radius
                    </Text>
                  </View>
                  <Text style={styles.osmAttribution}>© OpenStreetMap</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── SERVICE LOCATION CARD ── */}
          <Text style={styles.sectionHeading}>Service Location</Text>

          <View style={styles.locationCard}>
            <View style={styles.locIconBox}>
              <Ionicons name="location" size={20} color="#06684F" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.locTitleText} numberOfLines={1}>
                {serviceLocation}
              </Text>
              <Text style={styles.locSubText}>
                PIN: {pincode} • Primary dispatch base coordinates
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editPencilBtn}
              onPress={() => {
                setTempLocInput(serviceLocation);
                setEditLocModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color="#06684F" />
            </TouchableOpacity>
          </View>

          {/* ── SERVICE RADIUS SELECTOR ── */}
          <View style={styles.radiusSectionHeader}>
            <Text style={styles.sectionHeading}>Service Radius</Text>
            <View style={styles.radiusKmPill}>
              <Text style={styles.radiusKmPillText}>{radiusKm} km active</Text>
            </View>
          </View>

          <View style={styles.radiusCard}>
            <View style={styles.radiusStepsRow}>
              {[5, 10, 15, 20, 25, 30].map((step) => {
                const isSelected = radiusKm === step;
                return (
                  <TouchableOpacity
                    key={step}
                    style={[styles.stepBtn, isSelected && styles.stepBtnSelected]}
                    onPress={() => handleSelectRadius(step)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.stepBtnText, isSelected && styles.stepBtnTextSelected]}>
                      {step} km
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.radiusExplainer}>
              You will receive automated job dispatch alerts for requests posted within {radiusKm} km of your base marker.
            </Text>
          </View>

          {/* ── DYNAMIC LOCALITY & ZONE COVERAGE ── */}
          <View style={styles.coverageHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Locality Coverage</Text>
              <Text style={styles.coverageSubheading}>
                {totalSelected} selected across {coveredZonesCount} zones ({totalWithinRadius} within {radiusKm} km)
              </Text>
            </View>
          </View>

          {/* Search Localities Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your area, locality name, or PIN code, e.g. Gomti Nagar"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Bulk Actions Row */}
          <View style={styles.bulkActionsRow}>
            <TouchableOpacity
              style={styles.bulkBtn}
              onPress={handleSelectAllWithinRadius}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={14} color="#06684F" style={{ marginRight: 4 }} />
              <Text style={styles.bulkBtnText}>Select All ({totalWithinRadius})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkBtn, styles.bulkBtnSecondary]}
              onPress={handleDeselectAllWithinRadius}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={[styles.bulkBtnText, { color: '#64748B' }]}>Deselect All</Text>
            </TouchableOpacity>
          </View>

          {/* Grouped Zones List */}
          <View style={styles.zonesWrapper}>
            {coverageError ? (
              <View style={styles.coverageErrorBox}>
                <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                <Text style={styles.coverageErrorTitle}>Coverage Loading Failed</Text>
                <Text style={styles.coverageErrorSubtitle}>{coverageError}</Text>
                <TouchableOpacity
                  style={styles.retryCoverageBtn}
                  onPress={() => fetchDynamicCoverage(coordinates.lat, coordinates.lng, radiusKm, excludedIds)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryCoverageBtnText}>Retry Coverage</Text>
                </TouchableOpacity>
              </View>
            ) : filteredZones.length === 0 ? (
              <View style={styles.emptyResultsBox}>
                <Ionicons name="search-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyResultsText}>
                  {searchQuery ? 'No localities match your filter' : 'No localities available within selected radius'}
                </Text>
              </View>
            ) : (
              filteredZones.map((zone) => {
                const isExpanded = Boolean(expandedZones[zone.zoneId]);
                const localitiesInsideRadius = zone.localities.filter((l) => l.isWithinRadius);

                return (
                  <View key={zone.zoneId} style={styles.zoneCard}>
                    {/* Zone Accordion Header */}
                    <TouchableOpacity
                      style={styles.zoneHeader}
                      onPress={() => toggleZoneExpand(zone.zoneId)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.zoneNameRow}>
                          <Text style={styles.zoneNameText}>{zone.zoneName}</Text>
                          <Text style={styles.zoneIdPill}>{zone.zoneId}</Text>
                        </View>
                        <Text style={styles.zoneMetaText}>
                          {zone.selectedCount} / {localitiesInsideRadius.length} active in radius
                        </Text>
                      </View>

                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#64748B"
                      />
                    </TouchableOpacity>

                    {/* Zone Localities List */}
                    {isExpanded && (
                      <View style={styles.localitiesList}>
                        {zone.localities.map((loc) => {
                          const isExcluded = excludedIds.has(loc.localityId);
                          const isEligible = loc.isWithinRadius && !isExcluded;

                          return (
                            <TouchableOpacity
                              key={loc.localityId}
                              style={[
                                styles.localityRow,
                                !loc.isWithinRadius && styles.localityRowOutsideRadius
                              ]}
                              onPress={() => {
                                if (loc.isWithinRadius) {
                                  handleToggleLocality(loc.localityId);
                                } else {
                                  Alert.alert(
                                    'Outside Selected Radius',
                                    `${loc.name} is ${loc.distanceKm} km from your base (current radius: ${radiusKm} km). Increase radius to include this locality.`
                                  );
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.localityLeft}>
                                <View
                                  style={[
                                    styles.checkboxBox,
                                    isEligible && styles.checkboxBoxActive,
                                    !loc.isWithinRadius && styles.checkboxBoxDisabled
                                  ]}
                                >
                                  {isEligible && (
                                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                  )}
                                </View>
                                <View style={{ marginLeft: 10, flex: 1 }}>
                                  <View style={styles.localityTitleRow}>
                                    <Text
                                      style={[
                                        styles.localityNameText,
                                        !loc.isWithinRadius && styles.localityTextDimmed
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {loc.name}
                                    </Text>
                                    {loc.pinCode && (
                                      <Text style={styles.localityPinBadge}>{loc.pinCode}</Text>
                                    )}
                                  </View>
                                  <Text style={styles.localityDistanceText}>
                                    {loc.distanceKm != null ? `${loc.distanceKm} km away` : 'Lucknow'}
                                    {!loc.isWithinRadius && ' • Outside radius'}
                                    {isExcluded && loc.isWithinRadius && ' • Excluded by you'}
                                  </Text>
                                </View>
                              </View>

                              {/* Exclusion / Inclusion Status Indicator */}
                              {loc.isWithinRadius ? (
                                <View
                                  style={[
                                    styles.statusPill,
                                    isExcluded ? styles.statusPillExcluded : styles.statusPillIncluded
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusPillText,
                                      isExcluded
                                        ? styles.statusPillTextExcluded
                                        : styles.statusPillTextIncluded
                                    ]}
                                  >
                                    {isExcluded ? 'Excluded' : 'Covered'}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={styles.outsideRadiusLabel}>Out of range</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* ── SAVE CHANGES BUTTON ── */}
          <TouchableOpacity
            style={styles.saveAreaBtn}
            onPress={handleSaveChanges}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveAreaBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* ── CANCEL / RESET BUTTON ── */}
          <TouchableOpacity
            style={styles.cancelAreaBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelAreaBtnText}>Cancel</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── EDIT LOCATION MODAL ── */}
      <Modal visible={editLocModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Service Base Address</Text>
            <Text style={styles.modalSubtitle}>
              Specify your main workshop or operational address in Lucknow.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={tempLocInput}
              onChangeText={setTempLocInput}
              placeholder="Enter your workshop address, building, street, and PIN code"
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditLocModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveLocation}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerGpsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5'
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },

  // ── OpenStreetMap Card ──
  mapContainerCard: {
    height: 230,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative'
  },
  webviewContainer: {
    flex: 1,
    position: 'relative'
  },
  webview: {
    flex: 1
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  webviewLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B'
  },
  mapErrorFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  mapErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600'
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#06684F',
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'center',
    gap: 8
  },
  zoomControlsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3
  },
  zoomBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  recenterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3
  },
  mapBottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none'
  },
  mapCoordsBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  mapCoordsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  osmAttribution: {
    fontSize: 9,
    color: '#475569',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },

  // ── Location Card ──
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  locIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  locTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  locSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  editPencilBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // ── Radius Card ──
  radiusSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  radiusKmPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  radiusKmPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06684F'
  },
  radiusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  radiusStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  stepBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  stepBtnSelected: {
    backgroundColor: '#06684F',
    borderColor: '#06684F'
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },
  stepBtnTextSelected: {
    color: '#FFFFFF'
  },
  radiusExplainer: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16
  },

  // ── Coverage & Locality Section ──
  coverageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8
  },
  coverageSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -4,
    marginBottom: 8
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  bulkBtnSecondary: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0'
  },
  bulkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Zones Accordions ──
  zonesWrapper: {
    gap: 10,
    marginBottom: 16
  },
  emptyResultsBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyResultsText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600'
  },
  zoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFCFD'
  },
  zoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  zoneNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  zoneIdPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#06684F',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  zoneMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  localitiesList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  localityRowOutsideRadius: {
    opacity: 0.55
  },
  localityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  checkboxBoxActive: {
    backgroundColor: '#06684F',
    borderColor: '#06684F'
  },
  checkboxBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0'
  },
  localityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  localityNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A'
  },
  localityTextDimmed: {
    color: '#64748B'
  },
  localityPinBadge: {
    fontSize: 9,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  localityDistanceText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  statusPillIncluded: {
    backgroundColor: '#ECFDF5'
  },
  statusPillExcluded: {
    backgroundColor: '#FEF2F2'
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusPillTextIncluded: {
    color: '#06684F'
  },
  statusPillTextExcluded: {
    color: '#DC2626'
  },
  outsideRadiusLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic'
  },

  // ── Action Buttons ──
  saveAreaBtn: {
    marginTop: 10,
    backgroundColor: '#06684F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3
  },
  saveAreaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  cancelAreaBtn: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelAreaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B'
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16
  },
  modalBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B'
  },
  modalConfirmBtn: {
    backgroundColor: '#06684F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },

  // ── Coverage Error State ──
  coverageErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginVertical: 12
  },
  coverageErrorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginTop: 8,
    marginBottom: 4
  },
  coverageErrorSubtitle: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 12
  },
  retryCoverageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryCoverageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

