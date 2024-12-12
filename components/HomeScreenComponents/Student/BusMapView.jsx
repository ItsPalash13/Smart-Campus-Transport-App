import React, { useEffect, useState } from 'react';
import { Alert, View, StyleSheet, Image } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { getDatabase, ref, onValue } from 'firebase/database';
import { GOOGLE_MAPS_KEY } from '@env';

const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_KEY;
const busIcon = require('@/assets/images/bus.png');

const BusMapView = ({ busName }) => {
  const [busLocation, setBusLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [destination, setDestination] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [busHeading, setBusHeading] = useState(0); // For rotation if heading is available

  useEffect(() => {
    const fetchBusData = () => {
      const database = getDatabase(undefined, 'https://major-bus-app-default-rtdb.asia-southeast1.firebasedatabase.app');
      const busRef = ref(database, `/${busName}`);

      onValue(busRef, snapshot => {
        const busData = snapshot.val();
        if (busData) {
          setBusLocation(busData.coordinates);
          if (busData.heading) setBusHeading(busData.heading); // Set heading if available

          const routeData = Object.entries(busData.route)
            .map(([key, value]) => ({
              name: key,
              latitude: value.latitude,
              longitude: value.longitude,
              index: value.index,
            }))
            .sort((a, b) => a.index - b.index);

          setDestination(routeData[0]);
          setWaypoints(routeData.slice(1));
        }
      });
    };

    fetchBusData();
  }, [busName]);

  useEffect(() => {
    const requestLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        Alert.alert('Permission Denied', 'Location permission is required to show your position on the map.');
      }
    };

    requestLocationPermission();
  }, []);

  if (!busLocation || !destination) return null;

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: busLocation.latitude,
        longitude: busLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={!!currentLocation} // Show user location marker
    >
      {/* Bus Location Marker with custom icon orientation */}
      <Marker coordinate={busLocation} anchor={{ x: 0.5, y: 0.5 }}>
        <Image
          source={busIcon}
          style={[
            styles.busIcon,
            {
              transform: [{ rotate: `${busHeading}deg` }],
              marginBottom: 10,
            },
          ]}
        />
      </Marker>

      {/* User Current Location Marker */}
      {currentLocation && (
        <Marker
          coordinate={currentLocation}
          title="Your Location"
          pinColor="blue" // Customize as needed
        />
      )}

      {/* Destination Marker */}
      <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} pinColor="red" />

      {/* Waypoint Markers */}
      {waypoints.map((point, index) => (
        <Marker
          key={index}
          coordinate={{ latitude: point.latitude, longitude: point.longitude }}
          pinColor="green"
        />
      ))}

      {/* Directions */}
      <MapViewDirections
        origin={busLocation}
        destination={{ latitude: destination.latitude, longitude: destination.longitude }}
        waypoints={waypoints.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }))}
        apikey={GOOGLE_MAPS_API_KEY}
        strokeWidth={3}
        strokeColor="blue"
        optimizeWaypoints={true}
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    height: '100%',
    width: '100%',
    marginTop: 10,
  },
  busIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});

export default BusMapView;
