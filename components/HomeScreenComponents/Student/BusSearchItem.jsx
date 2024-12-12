import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getDatabase, ref, get } from 'firebase/database';
import { GOOGLE_MAPS_KEY } from '@env';
const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_KEY;

const BusItemSearch = ({ busName, destination, onSelectBus, sourceCoordinates }) => {
  const [coordinates, setCoordinates] = useState(null);
  const [route, setRoute] = useState([]);
  const [filteredRoute, setFilteredRoute] = useState([]);
  const [loading, setLoading] = useState(true);
  const [etaToSource, setEtaToSource] = useState(null);
  const [etaToDestination, setEtaToDestination] = useState(null);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const database = getDatabase(undefined, 'https://major-bus-app-default-rtdb.asia-southeast1.firebasedatabase.app');
        const busRef = ref(database, `/${busName}`);
        
        const snapshot = await get(busRef);
        if (snapshot.exists()) {
          const busData = snapshot.val();
          setCoordinates(busData.coordinates);
          setRoute(busData.route || {});
        } else {
          console.error(`No data available for bus: ${busName}`);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusData();
  }, [busName]);

  useEffect(() => {
    if (route && destination) {
      const routeArray = Object.entries(route).reverse();
      const destinationIndex = routeArray.findIndex(([key]) => key === destination);
      if (destinationIndex !== -1) {
        setFilteredRoute(routeArray.slice(0, destinationIndex + 1));
      } else {
        setFilteredRoute([]);
      }
    }
  }, [route, destination]);

  useEffect(() => {
    const fetchEta = async () => {
      if (coordinates) {
        const busLocation = `${coordinates.latitude},${coordinates.longitude}`;

        // Calculate ETA to source if provided
        if (sourceCoordinates) {
          const sourceLocation = `${sourceCoordinates.latitude},${sourceCoordinates.longitude}`;
          await calculateEta(busLocation, sourceLocation, setEtaToSource);
        }

        // Calculate ETA to destination with waypoints
        const destCoords = route[destination];
        if (destCoords) {
          const destinationLocation = `${destCoords.latitude},${destCoords.longitude}`;
          await calculateEtaWithWaypoints(busLocation, destinationLocation, setEtaToDestination);
        }
      }
    };

    fetchEta();
  }, [coordinates, destination, sourceCoordinates]);

  const calculateEta = async (origin, dest, setEta) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes.length > 0 && data.routes[0].legs.length > 0) {
        const totalDuration = data.routes[0].legs.reduce((acc, leg) => acc + leg.duration.value, 0);
        setEta(`${Math.round(totalDuration / 60)} mins`);
      } else {
        setEta("ETA not available");
      }
    } catch (error) {
      console.error("Error fetching ETA:", error);
      setEta("Error fetching ETA");
    }
  };

  const calculateEtaWithWaypoints = async (origin, destination, setEta) => {
    if (filteredRoute.length > 0) {
      const waypoints = filteredRoute
        .slice(0, -1) // Exclude the last element (the destination itself)
        .map(([stop]) => {
          const { latitude, longitude } = route[stop];
          return `via:${latitude},${longitude}`;
        })
        .join('|');

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=${waypoints}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes.length > 0 && data.routes[0].legs.length > 0) {
          const totalDuration = data.routes[0].legs.reduce((acc, leg) => acc + leg.duration.value, 0);
          setEta(`${Math.round(totalDuration / 60)} mins`);
        } else {
          setEta("ETA not available");
        }
      } catch (error) {
        console.error("Error fetching ETA with waypoints:", error);
        setEta("Error fetching ETA");
      }
    } else {
      // If there are no waypoints, just calculate the direct ETA
      calculateEta(origin, destination, setEta);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <TouchableOpacity onPress={onSelectBus} style={styles.buttonContainer}> 
      <View style={styles.buttonContent}>
        <Text style={styles.busName}>{busName}</Text>
        <Text style={styles.routeTitle}>Route to {destination}:</Text>
        {filteredRoute.length > 0 ? (
          filteredRoute.map(([stop], i) => (
            <Text key={stop} style={stop === destination ? styles.destinationText : styles.routeText}>
              {i + 1}. {stop}
            </Text>
          ))
        ) : (
          <Text style={styles.noRouteText}>No route information available for this destination.</Text>
        )}
        
        {sourceCoordinates ? (
          <Text style={styles.etaText}>ETA to Source: {etaToSource || 'Calculating...'}</Text>
        ) : null}

        <Text style={styles.etaText}>ETA to {destination}: {etaToDestination || 'Calculating...'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    backgroundColor: '#007AFF',       // Button background color
    borderRadius: 8,                  // Rounded corners
    paddingVertical: 12,              // Vertical padding
    paddingHorizontal: 16,            // Horizontal padding
    marginVertical: 8,                // Space between buttons
    elevation: 3,                     // Android shadow
    shadowColor: '#000',              // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonContent: {
    alignItems: 'center',             // Center text
  },
  busName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',                   // White text color for button style
  },
  routeTitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  routeText: {
    fontSize: 14,
    color: '#D6E4FF',                 // Slightly lighter color for routes
  },
  destinationText: {
    fontSize: 14,
    color: 'yellow',                  // Highlighted destination color
    fontWeight: 'bold',
  },
  noRouteText: {
    fontSize: 14,
    color: '#D6E4FF',
    textAlign: 'center',
    marginTop: 8,
  },
  etaText: {
    fontSize: 14,
    color: 'white',
    marginTop: 8,
  },
});

export default BusItemSearch;
