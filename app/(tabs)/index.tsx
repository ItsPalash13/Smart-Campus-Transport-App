import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { initializeApp } from '@firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from '@firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from '@firebase/firestore'; // Import Firestore functions
import AuthScreen from '@/components/AuthComponents/AuthScreen';
import AuthenticatedScreen from '@/components/AuthComponents/AuthenticatedScreen';
import AuthenticatedScreenStu from '@/components/AuthComponents/AuthenticatedScreenStu'; // Import AuthenticatedScreenStu
import firebaseConfig from '@/firebase.json';
import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';


// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [uType, setuType] = useState(null); // Store user type (0 or 1)
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Start loading when checking auth state
      if (user) {
        setUser(user);
        // Fetch the user's uType from Firestore
        const userDoc = await getDoc(doc(db, 'Users', user.uid));
        if (userDoc.exists()) {
          console.log(userDoc.data().utype)
          setuType(userDoc.data().utype); // Set the uType from Firestore
        }
      } else {
        setUser(null);
        setuType(null);
      }
      setLoading(false); // Stop loading after auth state change
    });

    return () => unsubscribe();
  }, [auth]);

  const handleAuthentication = async () => {
    setError('');
    setLoading(true); // Start loading when authentication begins
    try {
      if (user) {
        await signOut(auth); // Sign out the user
        setUser(null); // Clear user state
        setuType(null); // Clear uType state
      } else {
        if (isLogin) {
          const userCredential = await signInWithEmailAndPassword(auth, email, password); // Sign in existing user
          
          // Fetch the user's uType from Firestore
          const userId = userCredential.user.uid;
          const userDoc = await getDoc(doc(db, 'Users', userId));
          if (userDoc.exists()) {
            setuType(userDoc.data().utype); // Set the uType from Firestore
          }
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password); // Create a new user
          
          // Add user data to Firestore
          const userId = userCredential.user.uid; // Get the user ID
          await setDoc(doc(db, 'Users', userId), {
            uType: 1, // Add uType field with value 1
          });
          setuType(1); // Set uType to 1 after creating the new user
        }
      }
    } catch (error) {
      setError(error.message); // Set error message
    }
    setLoading(false); // Stop loading after authentication is complete
  };

  if (loading) {
    // Show loading indicator when loading
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user ? (
        uType === 0 ? (
          <AuthenticatedScreen auth={auth} user={user} />
        ) : uType === 1 ? (
          <AuthenticatedScreenStu auth={auth} user={user} />
        ) : null // Handle case where uType is not set yet
      ) : (
        <View style={styles.authContainer}>
          <AuthScreen
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            isLogin={isLogin}
            setIsLogin={setIsLogin}
            handleAuthentication={handleAuthentication} // Pass the handleAuthentication function
            error={error}
            setError={setError}
            loading={loading} // Pass loading state to AuthScreen
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
  },
  authContainer: {
    flex: 1, // Occupy all available space
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});