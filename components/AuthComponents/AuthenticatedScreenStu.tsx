import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { Dropdown } from 'react-native-element-dropdown';
import BusSearchItem from '@/components/HomeScreenComponents/Student/BusSearchItem';
import BusMapView from '@/components/HomeScreenComponents/Student/BusMapView'; // Import the BusMapView component

const AuthenticatedScreenStu = ({ user, auth }) => {
  const [destinations, setDestinations] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceToDestBuses, setSourceToDestBuses] = useState([]);
  const [onlyDestBuses, setOnlyDestBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);

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

    fetchDestinations();
  }, [user]);

  const fetchBuses = async () => {
    setSelectedBus(null); // Reset selectedBus when "Search Buses" is clicked
    if (!selectedDestination) return;

    try {
      const database = getDatabase(undefined, 'https://major-bus-app-default-rtdb.asia-southeast1.firebasedatabase.app');
      const busesRef = ref(database, '/');

      onValue(busesRef, snapshot => {
        const sourceToDestList = [];
        const onlyDestList = [];
        snapshot.forEach(childSnapshot => {
          const busData = childSnapshot.val();

          if (busData.route && busData.route[selectedDestination.label] !== undefined) {
            // Only Destination Logic
            onlyDestList.push({ id: childSnapshot.key, ...busData });
            
            // Source to Destination Logic
            if (selectedSource && busData.route[selectedSource.label] !== undefined) {
              const sourceIndex = busData.route[selectedSource.label].index;
              const destinationIndex = busData.route[selectedDestination.label].index;

              // Only include buses where the source index is higher than the destination index
              if (sourceIndex > destinationIndex) {
                sourceToDestList.push({ id: childSnapshot.key, ...busData });
              }
            }
          }
        });

        setSourceToDestBuses(sourceToDestList);
        setOnlyDestBuses(onlyDestList);
      }, {
        onlyOnce: true,
      });
      
    } catch (error) {
      console.error("Error fetching buses:", error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.authContainer}>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <Dropdown
              style={styles.dropdown}
              data={destinations}
              labelField="label"
              valueField="value"
              placeholder="Select Source"
              value={selectedSource?.value || null}
              onChange={item => setSelectedSource(item)}
              maxHeight={200}
              search
              searchPlaceholder="Search for source"
              renderLeftIcon={() => <Text>📍</Text>}
            />
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
          </>
        )}

        <Button title="Search Buses" onPress={fetchBuses} />

        {selectedBus ? (
          // Show BusMapView if a bus is selected
          <>
            <View style={{ height: 300 }}>
              <BusMapView busName={selectedBus} />
            </View>
          </>
        ) : (
          // Show the bus search results if no bus is selected
          <>
            <View style={styles.busList}>
              <Text style={styles.listTitle}>Source to Destination Buses</Text>
              {sourceToDestBuses.length > 0 ? (
                sourceToDestBuses.map((bus, index) => (
                  <BusSearchItem
                    busName={bus.id}
                    key={bus.id}
                    destination={selectedDestination.label}
                    sourceCoordinates={{ latitude: selectedSource.latitude, longitude: selectedSource.longitude }} // Pass source coordinates
                    onSelectBus={() => setSelectedBus(bus.id)}
                  />
                ))
              ) : (
                <Text style={styles.noBusesText}>No buses available for the selected source to destination route.</Text>
              )}
            </View>

            <View style={styles.busList}>
              <Text style={styles.listTitle}>Only Destination Buses</Text>
              {onlyDestBuses.length > 0 ? (
                onlyDestBuses.map((bus, index) => (
                  <BusSearchItem
                    busName={bus.id}
                    key={bus.id}
                    destination={selectedDestination.label}
                    onSelectBus={() => setSelectedBus(bus.id)}
                  />
                ))
              ) : (
                <Text style={styles.noBusesText}>No buses available for the selected destination.</Text>
              )}
            </View>
          </>
        )}

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  authContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  busList: {
    marginTop: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  noBusesText: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 20,
  },
});

export default AuthenticatedScreenStu;
