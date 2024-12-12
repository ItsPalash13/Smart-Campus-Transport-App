import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Image, Pressable, ScrollView, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import BusList from '@/components/HomeScreenComponents/Driver/BusList';
import DestinationDropdown from '@/components/HomeScreenComponents/Driver/DestinationDropdown';
import { signOut } from '@firebase/auth';
import { getFirestore, doc, updateDoc  } from 'firebase/firestore';
import { getDatabase, ref, set, remove } from 'firebase/database';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

import { GOOGLE_MAPS_KEY } from '@env';

import { MaterialIcons } from '@expo/vector-icons';

import * as Location from 'expo-location';

import { isPointWithinRadius } from 'geolib';
import AuthenticatedScreenStu from './AuthenticatedScreenStu';

const busIcon = require('@/assets/images/busicon1.png'); 

function CustomDrawerContent({ user, auth, selectedBus, setSelectedBus, navigation, stopTrackingLocation, removeRouteFromSelectedBus }) {
  const handleLogout = async () => {
    try {
      
      stopTrackingLocation();

      if (selectedBus) {
        await handleUnselect(selectedBus);
        await removeRouteFromSelectedBus(selectedBus);
      }

      await signOut(auth);
      
    } catch (error) {
      console.error("Error logging out: ", error.message);
    }
  };

  
  const handleUnselect = async (busIdToUnselect) => {
    if (!busIdToUnselect) return;
    const db = getFirestore();
    const busDocRef = doc(db, 'Bus-Driver', busIdToUnselect);
    try {
      await updateDoc(busDocRef, { Driver: null });
      setSelectedBus('');
    } catch (error) {
      console.error('Error unselecting bus: ', error);
    }
  };

  return (
    <DrawerContentScrollView>
      <View style={styles.drawerHeader}>
        <Text style={styles.title}>{user.displayName || 'User'}</Text>
        <Text style={styles.emailText}>{user.email}</Text>
      </View>
      <DrawerItem label="Home" onPress={() => navigation.navigate('Driver App')} />
      <DrawerItem label="Logout" onPress={handleLogout} labelStyle={{ color: '#e74c3c' }} />
      <DrawerItem label="Student" onPress={() => navigation.navigate('Student')} />
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator();

function AuthenticatedScreen({ user, auth }) {
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [tripStarted, setTripStarted] = useState(false);
  const [locationIntervalId, setLocationIntervalId] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);


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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      console.log("Location Permission Granted");
    })();
  }, []);
  

  const removeRouteFromSelectedBus = async (selectedBus) => {
    try {
      const db = getDatabase(undefined, 'https://major-bus-app-default-rtdb.asia-southeast1.firebasedatabase.app');
  
      const routeRef = ref(db, `${selectedBus}/route/`); 
  
      await remove(routeRef);
      
      console.log(`Route removed from bus ${selectedBus}`);
    } catch (error) {
      console.error("Failed to remove route from selected bus:", error);
    }
  };

  const sendGeolocationToFirebase = async () => {
    if (!selectedBus || !user) {
      console.log('User logged out or bus unselected. Stopping location update.');
      return; 
    }

    const db = getDatabase(undefined, 'https://major-bus-app-default-rtdb.asia-southeast1.firebasedatabase.app');
    try {
      
      const location = await Location.getLastKnownPositionAsync({});
      console.log("location",location);
      const locationRef = ref(db, `${selectedBus}/coordinates`);
      
      await set(locationRef, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      });

      setBusLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      checkGeofence(location.coords);
      console.log("Location sent",selectedBus , busLocation);
    } catch (error) {
      console.error('Error sending location data to Firebase: ', error);
    }
  };

  const startTrackingLocation = async () => {
    try {
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services to start the trip.",
          [{ text: "OK" }]
        );
        
        return;
      }
  

      if (!selectedBus || !selectedDestination) {
        Alert.alert(
          "Alert",
          "Please select both a bus and a destination before starting the trip.",
          [{ text: "OK" }]
        );
        return;
      }
  
      setTripStarted(true);
      updateBusRoute(selectedBus, selectedDestination, waypoints);
  
      const intervalId = setInterval(() => {
        sendGeolocationToFirebase();
      }, 2000);
      setLocationIntervalId(intervalId);
    } catch (error) {
      console.error("Error starting location tracking:", error);
    }
  };

  const stopTrackingLocation = () => {
    if (locationIntervalId) {
      clearInterval(locationIntervalId);
      setLocationIntervalId(null);
    }
  };

  const handleStartTrip = () => {
    
    startTrackingLocation();
    
  };

  const handleEndTrip = async () => {
    try {
      setTripStarted(false);
      stopTrackingLocation();
      await removeRouteFromSelectedBus(selectedBus);
      console.log('Trip ended and route removed successfully.');
    } catch (error) {
      console.error('Error ending trip:', error);
    }
  };
  

  const checkGeofence = (currentLocation) => {
    if (destinations.length === 0) {
        console.warn('No bus stops available for geofencing.');
        setLocationName(null);
        return;
    }

    let updatedWaypoints = [...waypoints];
    let isWithinAnyStop = false;

    destinations.forEach((stop) => {
        if (!stop.latitude || !stop.longitude) {
            console.warn('Invalid bus stop location data: ', stop);
            return;
        }

        const withinGeofence = isPointWithinRadius(
            { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            { latitude: stop.latitude, longitude: stop.longitude },
            200 
        );

        if (withinGeofence) {
            console.log("Inside BUS STOP RANGE", stop.label);
            setLocationName(stop.label);
            isWithinAnyStop = true;

            if (updatedWaypoints.find((wp) => wp.value === stop.label)) {
                setWaypoints(waypoints.filter((wp) => wp.value !== stop.label));
                
            }
        }
    });
    if (!isWithinAnyStop) {
        setLocationName(null);
    }
};

const updateBusRoute = async (selectedBus, destination, waypoints) => {
  
  try {
    const db = getDatabase(undefined, 'https://major-bus-app-default-rtdb.asia-southeast1.firebasedatabase.app');
    const routeRef = ref(db, `${selectedBus}/route`);

    // Create routeData with destination on top and each waypoint following
    const routeData = {
      [destination.label]: {
        index: 0,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
      ...Object.fromEntries(
        waypoints.map((waypoint, index) => [
          waypoint.label,
          {
            index: index + 1,
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
          },
        ])
      ),
    };

    // Update Firebase with new route data
    await set(routeRef, routeData);
    console.log("Firebase updated with new route:", routeData);
  } catch (error) {
    console.error("Failed to update route in Firebase:", error);
  }
};


useEffect(() => {
  if (selectedDestination && waypoints && selectedBus) {
    console.log("Updating route with destination and waypoints:", selectedDestination, waypoints);
    updateBusRoute(selectedBus, selectedDestination, waypoints);
    
  }
}, [selectedDestination, waypoints, selectedBus]);

  

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          user={user}
          auth={auth}
          selectedBus={selectedBus}
          setSelectedBus={setSelectedBus}
          stopTrackingLocation={stopTrackingLocation}
          removeRouteFromSelectedBus={removeRouteFromSelectedBus}
        />
      )}>
       

<Drawer.Screen
  name="Driver App"
  options={{
    title: 'Driver App',
    headerRight: () => (
      <MaterialIcons
        name="route" // choose any icon name from the MaterialIcons library
        size={24}
        color="black"
        style={{ marginRight: 16 }} // add padding if needed
        onPress={() => setIsExpanded(!isExpanded)} // Define the icon action
      />
    ),
  }}
>
  {(props) => (
    <ScrollView contentContainerStyle={{ flexGrow: 1}} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.stackContainer}>
        
        
          {locationName ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 30 }}>
              <Text style={styles.locationText}>Current Location : {locationName}</Text>
            </ScrollView>
          ) : null}

{tripStarted && busLocation && selectedDestination && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                showsUserLocation={true}
                region={{
                  latitude: busLocation.latitude,
                  longitude: busLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={busLocation} title="Bus Location" description="Current location">
                  <Image source={busIcon} style={{ height: 35, width: 35 }} />
                </Marker>

                {Array.isArray(waypoints) && waypoints.length > 0 ? (
                  waypoints.map((waypoint, index) => (
                    <Marker
                      key={index}
                      coordinate={{ latitude: waypoint.latitude, longitude: waypoint.longitude }}
                      title={waypoint.name}
                      description={`Waypoint ${index + 1}`}
                      pinColor="green"
                    />
                  ))
                ) : null}

                <Marker
                  coordinate={{
                    latitude: selectedDestination.latitude,
                    longitude: selectedDestination.longitude,
                  }}
                  title="Destination"
                  pinColor="red"
                />
                <MapViewDirections
                  origin={busLocation}
                  destination={{
                    latitude: selectedDestination.latitude,
                    longitude: selectedDestination.longitude,
                  }}
                  waypoints={Array.isArray(waypoints) ? waypoints : []}
                  apikey={GOOGLE_MAPS_KEY}
                  strokeWidth={3}
                  strokeColor="blue"
                  optimizeWaypoints={true}
                  onReady={(result) => {
                    console.log('Distance: ', result.distance);
                    console.log('Duration: ', result.duration);
                    console.log(Math.ceil(result.duration));  // Set ETA when the route is ready
                  }}
                />
              </MapView>
            </View>
          )}

          {isExpanded && (  
          <View style={styles.dropdownContainer}>
            <DestinationDropdown
              user={user}
              destinations={destinations} // Pass destinations here
              setDestinations={setDestinations}
              selectedDestination={selectedDestination}
              setSelectedDestination={setSelectedDestination}
              waypoints={waypoints}
              setWaypoints={setWaypoints}
            />
          </View>)}

         
        </View>
        <View style={{ position: 'fixed', bottom: 0, width: '100%', backgroundColor: '#fff' }}>
        <BusList
          {...props}
          user={user}
          selectedBus={selectedBus}
          setSelectedBus={setSelectedBus}
          busLocation={busLocation}
          setBusLocation={setBusLocation}
          tripStarted={tripStarted}
          setTripStarted={setTripStarted}
          handleEndTrip={handleEndTrip}
        />
        
        {!tripStarted ? (
          <Pressable style={styles.startTripButton} onPress={handleStartTrip}>
            <Text style={styles.buttonText}>Start Trip</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.endTripButton} onPress={handleEndTrip}>
            <Text style={styles.buttonText}>End Trip</Text>
          </Pressable>
        )}
      </View>
      </View>
    </ScrollView>
  )}
</Drawer.Screen>


      <Drawer.Screen name="Student">
    {(props) => <AuthenticatedScreenStu {...props} user={user} auth={auth} />}
  </Drawer.Screen>
  
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  noBusSelectedText: {
    color: 'black',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  drawerHeader: {
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  locationText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 10,
  },
  stackContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownContainer: {
    marginVertical: 8,
  },
  busListContainer: {
    marginVertical: 8,
  },
  mapContainer: {
    marginTop:10,
    height: 400
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  startTripButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  endTripButton: {
    backgroundColor: '#c0392b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AuthenticatedScreen;
