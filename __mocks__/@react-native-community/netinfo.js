export default {
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      type: "wifi",
      isInternetReachable: true,
    })
  ),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
