const DEV_URL = 'http://192.168.x.x:5000';
const PROD_URL = 'https://embercoffeeco-a-coffee-shop-mobile-applicat-production.up.railway.app';

// Set USE_PROD to true to point at the deployed backend during development
const USE_PROD = true;

export const BASE_URL = !__DEV__ || USE_PROD ? PROD_URL : DEV_URL;
