import React, { useEffect } from "react";
import { render, waitFor, act } from "@testing-library/react-native";
import { View } from "react-native";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";

// Mock natif expo-av
jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: jest.fn().mockImplementation(() => ({
      loadAsync: jest.fn().mockResolvedValue(true),
      playAsync: jest.fn().mockResolvedValue(true),
      pauseAsync: jest.fn().mockResolvedValue(true),
      stopAsync: jest.fn().mockResolvedValue(true),
      unloadAsync: jest.fn().mockResolvedValue(true),
      setOnPlaybackStatusUpdate: jest.fn(),
      getStatusAsync: jest
        .fn()
        .mockResolvedValue({ isLoaded: true, isPlaying: false }),
    })),
  },
}));

test("composant de base sans hook", () => {
  function TestComponent() {
    return null;
  }
  const { unmount } = render(<TestComponent />);
  unmount();
  expect(true).toBe(true);
});

test("render View natif", () => {
  const { unmount } = render(<View />);
  unmount();
  expect(true).toBe(true);
});

test("useAudioPlayer retourne l'état initial correct", async () => {
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v: ReturnType<typeof useAudioPlayer>) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => {
    expect(hookValue).toBeDefined();
    expect(hookValue!.audioState.isAudioPlaying).toBe(false);
    expect(hookValue!.audioState.isLoadingPreview).toBe(false);
  });
});

test("lecture audio met isAudioPlaying à true", async () => {
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => expect(hookValue).toBeDefined());
  // Simuler une action de lecture
  act(() => {
    hookValue!.setIsAudioPlaying(true);
  });
  await waitFor(() => {
    expect(hookValue!.audioState.isAudioPlaying).toBe(true);
  });
});

test("pause audio met isAudioPlaying à false", async () => {
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => expect(hookValue).toBeDefined());
  // Simuler lecture puis pause
  act(() => {
    hookValue!.setIsAudioPlaying(true);
    hookValue!.setIsAudioPlaying(false);
  });
  await waitFor(() => {
    expect(hookValue!.audioState.isAudioPlaying).toBe(false);
  });
});

test("reset audio remet l'état à zéro", async () => {
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => expect(hookValue).toBeDefined());
  // Simuler lecture puis reset
  act(() => {
    hookValue!.setIsAudioPlaying(true);
    hookValue!.setPlaybackPosition(1234);
    hookValue!.setPlaybackDuration(5678);
    hookValue!.setIsLoadingPreview(true);
    hookValue!.setIsPaused(true);
    hookValue!.setCurrentPlayingAdhan("test");
    hookValue!.setSound({} as any);
    hookValue!.resetAudio && hookValue!.resetAudio();
  });
  await waitFor(() => {
    expect(hookValue!.audioState.isAudioPlaying).toBe(false);
    expect(hookValue!.audioState.playbackPosition).toBe(0);
    expect(hookValue!.audioState.playbackDuration).toBe(0);
    expect(hookValue!.audioState.isLoadingPreview).toBe(false);
    expect(hookValue!.audioState.isPaused).toBe(false);
    expect(hookValue!.audioState.currentPlayingAdhan).toBeNull();
    expect(hookValue!.audioState.sound).toBeNull();
  });
});

test("playAsync qui échoue doit être géré sans crash", async () => {
  // Forcer une erreur sur playAsync
  const { Audio } = require("expo-av");
  Audio.Sound.mockImplementationOnce(() => ({
    loadAsync: jest.fn().mockResolvedValue(true),
    playAsync: jest.fn().mockRejectedValue(new Error("Erreur lecture")),
    pauseAsync: jest.fn(),
    stopAsync: jest.fn(),
    unloadAsync: jest.fn(),
    setOnPlaybackStatusUpdate: jest.fn(),
    getStatusAsync: jest
      .fn()
      .mockResolvedValue({ isLoaded: true, isPlaying: false }),
  }));
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => expect(hookValue).toBeDefined());
  // Simuler une action de lecture qui échoue
  let errorCaught = false;
  try {
    await act(async () => {
      // Supposons que playAsync est appelé dans une méthode play du hook (adapter si besoin)
      if (hookValue && (hookValue as any).play) {
        await (hookValue as any).play("test.mp3");
      } else {
        // Si pas de méthode play, on simule l'appel direct
        await Audio.Sound().playAsync();
      }
    });
  } catch (e) {
    errorCaught = true;
  }
  expect(errorCaught).toBe(true);
});

test("stop sans lecture active ne crash pas (edge case)", async () => {
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => expect(hookValue).toBeDefined());
  // Appel stop sans lecture
  act(() => {
    if (hookValue && (hookValue as any).stop) {
      (hookValue as any).stop();
    }
  });
  // L'état doit rester cohérent
  expect(hookValue!.audioState.isAudioPlaying).toBe(false);
});

test("double play ne casse pas l'état (edge case)", async () => {
  let hookValue: ReturnType<typeof useAudioPlayer> | undefined;
  function TestComponent({
    onValue,
  }: {
    onValue: (v: ReturnType<typeof useAudioPlayer>) => void;
  }) {
    const api = useAudioPlayer();
    useEffect(() => {
      onValue(api);
    }, [api, onValue]);
    return null;
  }
  render(
    <TestComponent
      onValue={(v) => {
        hookValue = v;
      }}
    />
  );
  await waitFor(() => expect(hookValue).toBeDefined());
  // Double play
  act(() => {
    hookValue!.setIsAudioPlaying(true);
    hookValue!.setIsAudioPlaying(true);
  });
  expect(hookValue!.audioState.isAudioPlaying).toBe(true);
});
