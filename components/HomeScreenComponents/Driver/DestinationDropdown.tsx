import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Button } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const DestinationDropdown = ({ user, selectedDestination, setSelectedDestination, destinations, setDestinations, waypoints = [], setWaypoints }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newWaypoint, setNewWaypoint] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
   // New state for collapsibility

  useEffect(() => {
    const fetchDestinations = async () => {
      if (!user) {
        setError('User not logged in. Cannot fetch destinations.');
        setLoading(false);
        return;
      }
      try {
        const db = getFirestore();
        const destinationCollection = collection(db, 'BusStops');
        const destinationSnapshot = await getDocs(destinationCollection);
        const destinationList = destinationSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            value: doc.id,
            label: data.name || doc.id,
            longitude: data.Longitude,
            latitude: data.Latitude,
          };
        });
        setDestinations(destinationList);
      } catch (error) {
        setError('Failed to load destinations.');
      } finally {
        setLoading(false);
      }
    };

    const fetchSavedRoutes = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const routeKeys = keys.filter(key => key !== 'routeSaveCounter');
        const routePromises = routeKeys.map(async key => {
          const routeData = await AsyncStorage.getItem(key);
          return { name: key, data: JSON.parse(routeData) };
        });
        const routes = await Promise.all(routePromises);
        setSavedRoutes(routes);
      } catch (error) {
        console.log('Failed to load saved routes:', error);
      }
    };

    fetchDestinations();
    fetchSavedRoutes();
  }, [user]);

  const updateWaypoint = (item, index) => {
    const updatedWaypoints = Array.isArray(waypoints) ? [...waypoints] : [];
    updatedWaypoints[index] = item;
    setWaypoints(updatedWaypoints);
  };

  const removeWaypoint = (index) => {
    const updatedWaypoints = waypoints.filter((_, i) => i !== index);
    setWaypoints(updatedWaypoints);
  };

  const addWaypoint = (item) => {
    setWaypoints([...waypoints, item]);
    setNewWaypoint({ label: null, value: null });
  };

  const saveRoute = async () => {
    if (!selectedDestination) return;

    const routeData = {
      [selectedDestination.label]: {
        index: 0,
        latitude: selectedDestination.latitude,
        longitude: selectedDestination.longitude,
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

    if (!routeName.trim()) {
      alert('Please enter a route name.');
      return;
    }

    try {
      await AsyncStorage.setItem(routeName, JSON.stringify(routeData));
      alert(`Route "${routeName}" saved successfully!`);
      setRouteName('');
      setModalVisible(false);
      setSavedRoutes(prev => [...prev, { name: routeName, data: routeData }]);
    } catch (error) {
      alert('Failed to save route.');
    }
  };

  const loadRoute = (route) => {
    const destinationLabel = Object.keys(route.data)[0];
    const destination = destinations.find(d => d.label === destinationLabel);
    const loadedWaypoints = Object.entries(route.data).map(([label, waypointData]) => ({
      label,
      value: label,
      latitude: waypointData.latitude,
      longitude: waypointData.longitude,
    }));

    setSelectedDestination(destination);
    setWaypoints(loadedWaypoints.slice(1));
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>      
        <>
          <Dropdown
            style={styles.dropdown}
            data={savedRoutes.map(route => ({ label: route.name, value: route.name }))}
            labelField="label"
            valueField="value"
            placeholder="Select Saved Route"
            value={selectedRoute}
            onChange={route => {
              setSelectedRoute(route.value);
              const selectedRouteData = savedRoutes.find(r => r.name === route.value);
              if (selectedRouteData) loadRoute(selectedRouteData);
            }}
            maxHeight={200}
            search
            searchPlaceholder="Search for route"
            renderLeftIcon={() => <Text>📍</Text>}
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Dropdown
              style={styles.dropdown}
              data={destinations}
              labelField="label"
              valueField="value"
              placeholder="Select Destination"
              value={selectedDestination?.value || null}
              onChange={item => setSelectedDestination(item)}
              maxHeight={200}
              search
              searchPlaceholder="Search for destination"
              renderLeftIcon={() => <Text>📍</Text>}
            />
          )}

          {Array.isArray(waypoints) && waypoints.length > 0 && waypoints.map((waypoint, index) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }} key={index}>
              <Dropdown
                style={[styles.dropdown, { width: '100%' }]}
                data={destinations}
                labelField="label"
                valueField="value"
                placeholder={`Edit Waypoint ${index + 1}`}
                value={waypoint?.value || null}
                onChange={item => updateWaypoint(item, index)}
                maxHeight={200}
                search
                searchPlaceholder="Search for waypoint"
                renderLeftIcon={() => <Text>📍</Text>}
              />
              <TouchableOpacity onPress={() => removeWaypoint(index)} style={{ marginLeft: 8 }}>
                <MaterialIcons name="close" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}

          <Dropdown
            style={styles.dropdown}
            data={destinations}
            labelField="label"
            valueField="value"
            placeholder="Add another waypoint"
            value={newWaypoint}
            onChange={item => addWaypoint(item)}
            maxHeight={200}
            search
            searchPlaceholder="Search for waypoint"
            renderLeftIcon={() => <Text>📍</Text>}
          />

          <View style={{marginTop:10}}>
          <Button title="Save Route" onPress={() => setModalVisible(true)}  />
          </View>
          

          <Modal visible={modalVisible} animationType="slide" transparent>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text>Enter Route Name:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Route Name"
                  value={routeName}
                  onChangeText={setRouteName}
                />
                <Button title="Save" onPress={saveRoute} />
                <Button title="Cancel" onPress={() => setModalVisible(false)} />
              </View>
            </View>
          </Modal>

          {Array.isArray(waypoints) && waypoints.length > 0 && (
            <View style={styles.waypointsContainer}>
              <Text>Selected Waypoints:</Text>
              {waypoints.map((waypoint, index) => (
                <Text key={index}>📍 {waypoint.label}</Text>
              ))}
            </View>
          )}
        </>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  toggleButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  waypointsContainer: {
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
});

export default DestinationDropdown;
