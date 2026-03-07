import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// TODO: Implement full map functionality (location, venue, directions, etc.)
// For now, basic structure with props

interface ProfileMapProps {
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export const ProfileMap: React.FC<ProfileMapProps> = ({
  venue,
  address,
  city,
  country,
  latitude,
  longitude,
}) => {
  // Replace with NativeMapView or web map as needed
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map</Text>
      {venue && <Text style={styles.venue}>{venue}</Text>}
      {address && <Text style={styles.address}>{address}</Text>}
      {city && country && (
        <Text style={styles.location}>{city}, {country}</Text>
      )}
      {/* Map rendering logic goes here */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>[Map will be rendered here]</Text>
        {latitude && longitude && (
          <Text style={styles.coords}>Lat: {latitude}, Lon: {longitude}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#22203A', // Use theme tokens in real implementation
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  venue: {
    fontSize: 16,
    color: '#FFC857',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#C9C9D6',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#2EC4B6',
    marginBottom: 8,
  },
  mapPlaceholder: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1B0F2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  mapText: {
    color: '#8D8D8D',
    fontSize: 14,
  },
  coords: {
    color: '#FF5E5B',
    fontSize: 12,
    marginTop: 4,
  },
});
