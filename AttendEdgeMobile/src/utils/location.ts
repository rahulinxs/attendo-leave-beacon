import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { LOCATION_TASK_NAME } from '../config/constants';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

interface Address {
  city?: string;
  country?: string;
  district?: string;
  isoCountryCode?: string;
  name?: string;
  postalCode?: string;
  region?: string;
  street?: string;
  streetNumber?: string;
  subregion?: string;
  timezone?: string;
}

export interface LocationWithAddress extends LocationData {
  address?: Address;
  error?: string;
}

/**
 * Get current device location with high accuracy
 */
export const getCurrentLocation = async (): Promise<LocationWithAddress> => {
  try {
    // Check if location services are enabled
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Get current position with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 seconds
    });

    // Reverse geocode to get address
    const address = await reverseGeocode(location.coords);

    return {
      ...location.coords,
      timestamp: location.timestamp,
      address,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return {
      latitude: 0,
      longitude: 0,
      error: error.message || 'Failed to get location',
    };
  }
};

/**
 * Reverse geocode coordinates to get address
 */
export const reverseGeocode = async (
  coords: { latitude: number; longitude: number }
): Promise<Address | undefined> => {
  try {
    const address = await Location.reverseGeocodeAsync(coords);
    return address[0];
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return undefined;
  }
};

/**
 * Start background location tracking
 */
export const startBackgroundLocationTracking = async () => {
  // Check if location permissions are granted
  const { status } = await Location.requestBackgroundPermissionsAsync();
  
  if (status !== 'granted') {
    console.warn('Background location permission not granted');
    return false;
  }

  // Check if task is already defined
  const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
  
  if (!isTaskDefined) {
    // Define the background task
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];
        
        if (location) {
          // Process the location (e.g., send to server)
          console.log('Background location update:', location);
        }
      }
    });
  }

  // Start location updates in the background
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100, // meters
    timeInterval: 10000, // 10 seconds
    deferredUpdatesInterval: 60000, // 1 minute
    deferredUpdatesDistance: 100, // meters
    foregroundService: {
      notificationTitle: 'Tracking your location',
      notificationBody: 'AttendEdge is tracking your location in the background',
      notificationColor: '#4CAF50',
    },
  });

  // Register background fetch task
  await BackgroundFetch.registerTaskAsync(LOCATION_TASK_NAME, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });

  return true;
};

/**
 * Stop background location tracking
 */
export const stopBackgroundLocationTracking = async () => {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    await BackgroundFetch.unregisterTaskAsync(LOCATION_TASK_NAME);
    return true;
  } catch (error) {
    console.error('Error stopping background location tracking:', error);
    return false;
  }
};

/**
 * Calculate distance between two coordinates in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  // Haversine formula
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if a location is within a geofence
 */
export const isWithinGeofence = (
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  radius: number // in meters
): boolean => {
  const distance = calculateDistance(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );
  return distance <= radius;
};
