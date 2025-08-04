export const Location = {
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
};

export const LocationAccuracy = {
  High: "high",
  Balanced: "balanced",
  Low: "low",
};
