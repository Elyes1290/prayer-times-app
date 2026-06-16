import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, Alert, type ListRenderItemInfo } from 'react-native';
import { usePrayerTimesWidget } from '../hooks/usePrayerTimesWidget';
import { useRouter } from 'expo-router';
import { NativeModules, Platform } from 'react-native';

const { PrayerTimesWidgetModule } = NativeModules;

type LogEntry = { id: string; text: string };

const LogListItem = React.memo(function LogListItem({ text }: { text: string }) {
  return <Text style={styles.logText}>{text}</Text>;
});

export default function DebugWidgetScreen() {
  const { back } = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { isWidgetAvailable, updatePrayerTimes, getPrayerTimes, forceWidgetRefresh } = usePrayerTimesWidget();

  // 🔒 Désactiver en production
  useEffect(() => {
    if (!__DEV__) {
      Alert.alert(
        "Accès refusé",
        "Cette page n'est disponible qu'en mode développement.",
        [{ text: "OK", onPress: () => back() }]
      );
    }
  }, [back]);

  const renderLogItem = useCallback(
    ({ item: entry }: ListRenderItemInfo<LogEntry>) => (
      <LogListItem text={entry.text} />
    ),
    [],
  );

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const text = `[${timestamp}] ${message}`;
    setLogs((prev) => [
      { id: `${Date.now()}-${prev.length}`, text },
      ...prev,
    ]);
    console.log(`[DebugWidget] ${message}`);
  };

  const testModuleExists = useCallback(() => {
    addLog('=== TEST MODULE EXISTS ===');
    addLog(`Platform.OS: ${Platform.OS}`);
    addLog(`PrayerTimesWidgetModule existe: ${!!PrayerTimesWidgetModule}`);

    if (PrayerTimesWidgetModule) {
      addLog('✅ Module trouvé !');
      addLog(`Méthodes disponibles: ${Object.keys(PrayerTimesWidgetModule).join(', ')}`);
    } else {
      addLog('❌ Module non trouvé !');
    }
  }, []);

  const testWidgetAvailability = useCallback(async () => {
    addLog('=== TEST DISPONIBILITÉ ===');
    addLog(`isWidgetAvailable: ${isWidgetAvailable}`);

    if (PrayerTimesWidgetModule) {
      try {
        const available = await PrayerTimesWidgetModule.isWidgetAvailable();
        addLog(`✅ Widget disponible: ${available}`);
      } catch (error: any) {
        addLog(`❌ Erreur: ${error.message}`);
      }
    }
  }, [isWidgetAvailable]);

  const testModuleExistsRef = useRef(testModuleExists);
  const testWidgetAvailabilityRef = useRef(testWidgetAvailability);
  testModuleExistsRef.current = testModuleExists;
  testWidgetAvailabilityRef.current = testWidgetAvailability;

  useEffect(() => {
    const timer1 = setTimeout(() => testModuleExistsRef.current(), 500);
    const timer2 = setTimeout(() => testWidgetAvailabilityRef.current(), 1000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const testWritePrayerTimes = async () => {
    addLog('=== TEST ÉCRITURE ===');
    
    const testTimes = {
      Fajr: '05:30',
      Sunrise: '07:00',
      Dhuhr: '13:15',
      Asr: '16:30',
      Maghrib: '18:23',
      Isha: '19:45',
    };
    
    addLog(`Envoi des horaires: ${JSON.stringify(testTimes)}`);
    
    try {
      await updatePrayerTimes(testTimes);
      addLog('✅ Horaires envoyés avec succès !');
      
      // Attendre un peu et relire
      setTimeout(async () => {
        const readTimes = await getPrayerTimes();
        addLog(`Lecture: ${JSON.stringify(readTimes)}`);
      }, 1000);
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const testForceRefresh = async () => {
    addLog('=== TEST REFRESH ===');
    try {
      await forceWidgetRefresh();
      addLog('✅ Widget rafraîchi !');
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => back()} style={styles.backButton}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Debug Widget iOS</Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Status Module:</Text>
        <Text style={styles.statusValue}>
          {PrayerTimesWidgetModule ? '✅ Chargé' : '❌ Non chargé'}
        </Text>
        <Text style={styles.statusLabel}>Widget Disponible:</Text>
        <Text style={styles.statusValue}>
          {isWidgetAvailable ? '✅ Oui' : '❌ Non'}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <Pressable style={styles.button} onPress={testModuleExists}>
          <Text style={styles.buttonText}>1. Test Module</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={testWidgetAvailability}>
          <Text style={styles.buttonText}>2. Test Disponibilité</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={testWritePrayerTimes}>
          <Text style={styles.buttonText}>3. Test Écriture</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={testForceRefresh}>
          <Text style={styles.buttonText}>4. Rafraîchir Widget</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.clearButton]} 
          onPress={() => setLogs([])}
        >
          <Text style={styles.buttonText}>Effacer Logs</Text>
        </Pressable>
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Logs:</Text>
        <FlatList
          style={styles.logsScroll}
          data={logs}
          keyExtractor={(entry) => entry.id}
          renderItem={renderLogItem}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 50,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#4A90E2',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBox: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  statusLabel: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  statusValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonsContainer: {
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#E24A4A',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logsContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
  },
  logsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logsScroll: {
    flex: 1,
  },
  logText: {
    color: '#0f0',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 5,
  },
});
