// MapWithDirections.js

import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GOOGLE_MAPS_KEY } from '@env';

const busIcon = require('@/assets/images/busicon1.png'); // Adjust the path if needed

function MapWithDirections({
  busLocation,
  selectedDestination,
  waypoints,
  onReady,
}) {
  const busLocationAnimated = useRef(new AnimatedRegion({
    latitude: busLocation?.latitude || 0,
    longitude: busLocation?.longitude || 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })).current;

  useEffect(() => {
    if (busLocation) {
      busLocationAnimated.timing({
        latitude: busLocation.latitude,
        longitude: busLocation.longitude,
        duration: 500,
      }).start();
    }
  }, [busLocation]);

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        region={{
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Marker for the bus location */}
        <Marker coordinate={busLocation} title="Bus Location" description="Current location">
          <Image source={busIcon} style={{ height: 35, width: 35 }} />
        </Marker>

        {/* Markers for waypoints */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: waypoint.latitude, longitude: waypoint.longitude }}
            title={waypoint.name}
            description={`Waypoint ${index + 1}`}
            pinColor="green"
          />
        ))}

        {/* Marker for destination */}
        <Marker
          coordinate={{
            latitude: selectedDestination.latitude,
            longitude: selectedDestination.longitude,
          }}
          title="Destination"
          pinColor="blue"
        />

        {/* Directions */}
        <MapViewDirections
          origin={busLocation}
          destination={{
            latitude: selectedDestination.latitude,
            longitude: selectedDestination.longitude,
          }}
          waypoints={waypoints}
          apikey={GOOGLE_MAPS_KEY}
          strokeWidth={3}
          strokeColor="hotpink"
          optimizeWaypoints={true}
          onReady={onReady}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapWithDirections;
