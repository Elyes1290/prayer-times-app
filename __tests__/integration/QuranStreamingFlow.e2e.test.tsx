import React from "react";
import { render, act } from "@testing-library/react-native";

// Mocks minimaux requis
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb || k }),
}));
jest.mock("expo-modules-core", () => ({
  NativeModule: class {},
  requireNativeModule: jest.fn(() => ({})),
  NativeModulesProxy: {},
  EventEmitter: class {},
}));
jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(async () => ""),
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 1024 })),
  downloadAsync: jest.fn(async () => ({
    uri: "file:///tmp/seg.mp3",
    status: 200,
  })),
  writeAsStringAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  makeDirectoryAsync: jest.fn(async () => undefined),
  StorageAccessFramework: {},
}));
jest.mock("expo-av", () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(async () => ({
        sound: {
          unloadAsync: jest.fn(async () => undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
        },
      })),
    },
    setAudioModeAsync: jest.fn(async () => undefined),
  },
}));

describe("Integration: Quran Streaming Flow", () => {
  test("crée une session et démarre le streaming avec segments", async () => {
    const AudioStreamingManager = require("../../utils/audioStreaming").default;
    const manager = AudioStreamingManager.getInstance();

    const sessionId = await manager.createStreamingSession(
      "recitation_1",
      "https://cdn.test/audio/quran.mp3",
      60
    );

    await act(async () => {
      const sound = await manager.startStreaming(sessionId);
      expect(sound).not.toBeNull();
    });

    const stats = manager.getStreamingStats();
    expect(typeof stats.activeSessions).toBe("number");

    await act(async () => {
      await manager.stopStreaming(sessionId);
    });
  });
});
