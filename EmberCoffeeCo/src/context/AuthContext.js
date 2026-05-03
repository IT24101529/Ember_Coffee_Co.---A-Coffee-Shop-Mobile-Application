import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { reset } from '../navigation/navigationRef';

const AuthContext = createContext({});

const TOKEN_KEY = '@ember_token';
const USER_KEY = '@ember_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const interceptorRef = useRef(null);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    })();
  }, []);

  // Set up Axios response interceptor
  useEffect(() => {
    interceptorRef.current = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.response) {
          // Network error (no response from server)
          Alert.alert('No internet connection');
          return Promise.reject(error);
        }

        const { status, data } = error.response;

        if (status === 401) {
          // Unauthorized — log out and redirect to login
          await logout();
          reset({ index: 0, routes: [{ name: 'Login' }] });
        } else if (status === 403) {
          Alert.alert('Access denied');
        } else if (status === 400 || status === 409) {
          const message = data?.message || 'Something went wrong';
          Alert.alert(message);
        }

        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (newToken, newUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
