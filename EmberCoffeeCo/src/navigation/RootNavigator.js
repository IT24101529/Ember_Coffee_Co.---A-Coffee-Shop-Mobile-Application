import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';

// Auth screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Customer screens
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import RewardsScreen from '../screens/RewardsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Nested stack screens
import ProductDetailScreen from '../screens/ProductDetailScreen';
import MyRewardsScreen from '../screens/MyRewardsScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import CartScreen from '../screens/CartScreen';

// Admin screens
import ReviewsFeedScreen from '../screens/ReviewsFeedScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductManagementScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminRewardsScreen from '../screens/admin/AdminRewardsScreen';
import AdminPromotionsScreen from '../screens/admin/AdminPromotionsScreen';
import AdminAddProductScreen from '../screens/admin/AdminAddProductScreen';
import AdminAddRewardScreen from '../screens/admin/AdminAddRewardScreen';
import AdminAddPromoScreen from '../screens/admin/AdminAddPromoScreen';
import AdminUserManagementScreen from '../screens/admin/AdminUserManagementScreen';
import AdminAddUserScreen from '../screens/admin/AdminAddUserScreen';
import AccessRestrictedScreen from '../screens/admin/AccessRestrictedScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const stackOptions = { headerShown: false };

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );
}

function MenuStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="MenuScreen" component={MenuScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ReviewsFeed" component={ReviewsFeedScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );
}

function RewardsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="RewardsScreen" component={RewardsScreen} />
      <Stack.Screen name="MyRewards" component={MyRewardsScreen} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="OrdersScreen" component={OrdersScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="ReviewsFeed" component={ReviewsFeedScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} />
      <Stack.Screen name="AdminAddProduct" component={AdminAddProductScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AdminRewards" component={AdminRewardsScreen} />
      <Stack.Screen name="AdminAddReward" component={AdminAddRewardScreen} />
      <Stack.Screen name="AdminPromotions" component={AdminPromotionsScreen} />
      <Stack.Screen name="AdminAddPromo" component={AdminAddPromoScreen} />
      <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} />
      <Stack.Screen name="AdminAddUser" component={AdminAddUserScreen} />
    </Stack.Navigator>
  );
}

// Manager stack — Orders and Products only
function ManagerStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} />
      <Stack.Screen name="AdminAddProduct" component={AdminAddProductScreen} />
      <Stack.Screen name="AdminDashboard" component={AccessRestrictedScreen} />
      <Stack.Screen name="AdminRewards" component={AccessRestrictedScreen} />
      <Stack.Screen name="AdminPromotions" component={AccessRestrictedScreen} />
      <Stack.Screen name="AdminUserManagement" component={AccessRestrictedScreen} />
    </Stack.Navigator>
  );
}

const tabOptions = {
  headerShown: false,
  tabBarStyle: { display: 'none' },
};

function AppTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Menu" component={MenuStack} />
      <Tab.Screen name="Rewards" component={RewardsStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminStack} />}
      {isManager && <Tab.Screen name="Manager" component={ManagerStack} />}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token } = useAuth();
  return token ? <AppTabs /> : <AuthStack />;
}
