const jest = global.jest || require("jest-mock");
let store = {};

const AsyncStorage = {
  getItem: jest.fn((key) =>
    Promise.resolve(store[key] !== undefined ? store[key] : null)
  ),
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  __reset: () => {
    store = {};
  },
};

module.exports = AsyncStorage;
