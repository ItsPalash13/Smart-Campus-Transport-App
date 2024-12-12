import { Text, StyleSheet, View, Button, TouchableOpacity } from 'react-native';
import React, { Component } from 'react';
import { TextInput } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // Import MaterialIcons

export default class AuthScreen extends Component {
  render() {
    const { email, setEmail, password, setPassword, isLogin, setIsLogin, handleAuthentication, error, loading } = this.props; // Accept loading prop

    return (
      <View style={styles.authContainer}>
        <Text style={styles.title}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>

        <TextInput
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          mode="outlined"
          label="Email"
          placeholder="Type your email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        {loading ? ( // Show refresh icon when loading is true
          <TouchableOpacity style={styles.iconButton} onPress={handleAuthentication}>
            <MaterialIcons name="refresh" size={24} color="black" />
          </TouchableOpacity>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.buttonContainer}>
          <Button title={isLogin ? 'Sign In' : 'Sign Up'} onPress={handleAuthentication} color="#3498db" disabled={loading} />
        </View>

        <View style={styles.bottomContainer}>
          <Text style={styles.toggleText} onPress={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  authContainer: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  toggleText: {
    color: '#3498db',
    textAlign: 'center',
  },
  bottomContainer: {
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50, // Set a fixed width
    height: 50, // Set a fixed height
    marginVertical: 16, // Add vertical margin if needed
  },
});
