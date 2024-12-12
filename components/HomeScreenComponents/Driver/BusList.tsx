import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import * as Location from 'expo-location';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialIcons } from '@expo/vector-icons';
import { Grid, Row } from 'react-native-paper-grid';

function BusListComponent({ user, selectedBus, setSelectedBus,handleEndTrip, busLocation, setBusLocation, tripStarted, setTripStarted }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    
  }, [user]);

  const fetchData = async () => {
    const db = getFirestore();
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'Bus-Driver'));
      const docsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(docsData);
    } catch (error) {
      console.error('Error fetching data: ', error);
    }
    setLoading(false);
  };


  const handleSelectBus = async (newBusId) => {
    const db = getFirestore();
    const busDocRef = doc(db, 'Bus-Driver', newBusId);

    try {
      const busSnapshot = await getDoc(busDocRef);
      const selectedBusData = busSnapshot.data();

      if (selectedBusData && selectedBusData.Driver) {
        Alert.alert("Bus Locked", "This bus is currently locked by another driver.");
        await fetchData();
        return;
      }

      if (selectedBus) {
        await handleUnselect(selectedBus);
      }

      setSelectedBus(newBusId);
      await updateDoc(busDocRef, {
        Driver: user.uid,
      });

      await fetchData();
    } catch (error) {
      console.error('Error selecting bus: ', error);
    }
  };

  const handleUnselect = async (busIdToUnselect) => {
    if (!busIdToUnselect && !selectedBus) return;
    handleEndTrip()

    const db = getFirestore();
    const busDocRef = doc(db, 'Bus-Driver', busIdToUnselect || selectedBus);

    try {
      await updateDoc(busDocRef, {
        Driver: null,
      });
      setSelectedBus('');
      setBusLocation(null);
      setTripStarted(false);

      await fetchData();
    } catch (error) {
      console.error('Error unselecting bus: ', error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const dropdownOptions = data.map((bus) => ({
    label: bus.Driver ? `${bus.id} (Locked)` : bus.id,
    value: bus.id,
    disabled: !!bus.Driver,
  }));

  return (
    <View style={styles.container}>
      {data.length > 0 ? (
        <Grid style={styles.grid}>
          <Row style={styles.row}>
            <View style={styles.dropdownContainer}>
              <Dropdown
                mode="auto"
                style={styles.dropdown}
                data={dropdownOptions}
                labelField="label"
                valueField="value"
                placeholder="Select a Bus"
                value={selectedBus}
                onChange={item => handleSelectBus(item.value)}
                maxHeight={400}
                renderLeftIcon={() => <Text>🚌 </Text>}
                containerStyle={styles.dropdown}
              />
            </View>

            {/* Cross icon to unselect bus */}
            {selectedBus && (
              <TouchableOpacity onPress={() => handleUnselect(selectedBus)} style={styles.crossButton}>
                <MaterialIcons name="cancel" size={24} color="black" />
              </TouchableOpacity>
            )}

            {/* Refresh button */}
            <TouchableOpacity onPress={fetchData} style={styles.reloadButton}>
              <MaterialIcons name="refresh" size={24} color="black" />
            </TouchableOpacity>
          </Row>
        </Grid>
      ) : (
        <Text>No bus drivers found.</Text>
      )}
    </View>
  );
}

export default function BusList({ user, selectedBus, setSelectedBus,handleEndTrip, busLocation, setBusLocation, tripStarted, setTripStarted }) {
  return (
    <BusListComponent
      user={user}
      selectedBus={selectedBus}
      setSelectedBus={setSelectedBus}
      busLocation={busLocation}
      setBusLocation={setBusLocation}
      tripStarted={tripStarted}
      setTripStarted={setTripStarted}
      handleEndTrip={handleEndTrip}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  grid: {
    width: '100%',
    padding: 0,
  },
  row: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 0,
  },
  dropdownContainer: {
    flex: 14,
    padding: 0,
  },
  crossButton: {
    flex: 1.2,
    padding: 0,
    marginLeft:5,
    justifyContent: 'center',
    alignItems: 'center',

  },
  reloadButton: {
    flex: 1,
    padding: 5,
    color:"black",

    justifyContent: 'center',
    alignItems: 'center',
  },
});
