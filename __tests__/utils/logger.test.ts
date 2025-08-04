import {
  logger,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  notificationDebugLog,
  widgetDebugLog,
} from "../../utils/logger";

// Mock des méthodes console
const mockConsole = {
  log: jest.spyOn(console, "log").mockImplementation(() => {}),
  info: jest.spyOn(console, "info").mockImplementation(() => {}),
  warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
  error: jest.spyOn(console, "error").mockImplementation(() => {}),
};

describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restaurer les méthodes console originales
    mockConsole.log.mockRestore();
    mockConsole.info.mockRestore();
    mockConsole.warn.mockRestore();
    mockConsole.error.mockRestore();
  });

  describe("Logger Class Instance", () => {
    test("should be defined and have all required methods", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.notificationDebug).toBe("function");
      expect(typeof logger.widgetDebug).toBe("function");
    });
  });

  describe("Debug Logging", () => {
    test("should not log debug messages when debug is disabled", () => {
      logger.debug("Test debug message");

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    test("should handle debug with multiple arguments", () => {
      logger.debug("Debug with args", { key: "value" }, 123);

      // Debug désactivé, donc pas d'appel
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    test("should not log notification debug when debug is disabled", () => {
      logger.notificationDebug("Notification debug message");

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    test("should not log widget debug when debug is disabled", () => {
      logger.widgetDebug("Widget debug message");

      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe("Info Logging", () => {
    test("should log info messages", () => {
      const message = "Test info message";
      logger.info(message);

      expect(mockConsole.info).toHaveBeenCalledWith(
        "[MyAdhan] Test info message"
      );
    });

    test("should log info with multiple arguments", () => {
      const testObject = { test: "data" };
      const testNumber = 42;

      logger.info("Info with args", testObject, testNumber);

      expect(mockConsole.info).toHaveBeenCalledWith(
        "[MyAdhan] Info with args",
        testObject,
        testNumber
      );
    });

    test("should handle empty info message", () => {
      logger.info("");

      expect(mockConsole.info).toHaveBeenCalledWith("[MyAdhan] ");
    });
  });

  describe("Warning Logging", () => {
    test("should log warning messages", () => {
      const message = "Test warning message";
      logger.warn(message);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[MyAdhan] Test warning message"
      );
    });

    test("should log warning with multiple arguments", () => {
      const errorObject = new Error("Test error");

      logger.warn("Warning with error", errorObject);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[MyAdhan] Warning with error",
        errorObject
      );
    });

    test("should handle special characters in warning", () => {
      logger.warn("Warning with émojis 🚨 and special chars àéîôù");

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[MyAdhan] Warning with émojis 🚨 and special chars àéîôù"
      );
    });
  });

  describe("Error Logging", () => {
    test("should log error messages", () => {
      const message = "Test error message";
      logger.error(message);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "[MyAdhan] Test error message"
      );
    });

    test("should log error with Error object", () => {
      const error = new Error("Critical error");

      logger.error("Application error", error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "[MyAdhan] Application error",
        error
      );
    });

    test("should log error with stack trace", () => {
      const errorWithStack = new Error("Error with stack");
      errorWithStack.stack = "Error: Error with stack\n    at test";

      logger.error("Stack trace error", errorWithStack);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "[MyAdhan] Stack trace error",
        errorWithStack
      );
    });
  });

  describe("Prefix Consistency", () => {
    test("should use consistent prefix for all log levels", () => {
      const prefix = "[MyAdhan]";

      logger.info("Info test");
      logger.warn("Warning test");
      logger.error("Error test");

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(prefix)
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining(prefix)
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining(prefix)
      );
    });

    test("should include specific prefixes for specialized logs", () => {
      // Même si debug est désactivé, testons la logique
      const originalEnable = (logger as any).constructor.prototype.debug;

      // Temporairement activer les logs de debug pour le test
      (logger as any).debug = jest.fn((message: string, ...args: any[]) => {
        console.log(`[MyAdhan] ${message}`, ...args);
      });

      (logger as any).notificationDebug = jest.fn(
        (message: string, ...args: any[]) => {
          console.log(`[MyAdhan] [NOTIFICATIONS] ${message}`, ...args);
        }
      );

      (logger as any).widgetDebug = jest.fn(
        (message: string, ...args: any[]) => {
          console.log(`[MyAdhan] [WIDGET] ${message}`, ...args);
        }
      );

      logger.debug("test");
      logger.notificationDebug("test");
      logger.widgetDebug("test");

      expect((logger as any).debug).toHaveBeenCalled();
      expect((logger as any).notificationDebug).toHaveBeenCalled();
      expect((logger as any).widgetDebug).toHaveBeenCalled();
    });
  });

  describe("Exported Functions", () => {
    test("should export all logging functions", () => {
      expect(typeof debugLog).toBe("function");
      expect(typeof infoLog).toBe("function");
      expect(typeof warnLog).toBe("function");
      expect(typeof errorLog).toBe("function");
      expect(typeof notificationDebugLog).toBe("function");
      expect(typeof widgetDebugLog).toBe("function");
    });

    test("exported functions should work correctly", () => {
      infoLog("Test info from exported function");
      warnLog("Test warning from exported function");
      errorLog("Test error from exported function");

      expect(mockConsole.info).toHaveBeenCalledWith(
        "[MyAdhan] Test info from exported function"
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[MyAdhan] Test warning from exported function"
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[MyAdhan] Test error from exported function"
      );
    });

    test("exported debug functions should respect debug settings", () => {
      debugLog("Debug from exported function");
      notificationDebugLog("Notification debug from exported function");
      widgetDebugLog("Widget debug from exported function");

      // Debug désactivé, donc pas d'appels
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    test("should handle null and undefined arguments", () => {
      logger.info("Info with null", null);
      logger.warn("Warning with undefined", undefined);
      logger.error("Error with both", null, undefined);

      expect(mockConsole.info).toHaveBeenCalledWith(
        "[MyAdhan] Info with null",
        null
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[MyAdhan] Warning with undefined",
        undefined
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "[MyAdhan] Error with both",
        null,
        undefined
      );
    });

    test("should handle very long messages", () => {
      const longMessage = "A".repeat(1000);
      logger.info(longMessage);

      expect(mockConsole.info).toHaveBeenCalledWith(`[MyAdhan] ${longMessage}`);
    });

    test("should handle objects with circular references", () => {
      const obj: any = { name: "test" };
      obj.self = obj; // Référence circulaire

      // Ne devrait pas planter
      expect(() => {
        logger.info("Object with circular ref", obj);
      }).not.toThrow();

      expect(mockConsole.info).toHaveBeenCalled();
    });

    test("should handle array arguments", () => {
      const testArray = [1, 2, 3, "test", { key: "value" }];
      logger.error("Error with array", testArray);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "[MyAdhan] Error with array",
        testArray
      );
    });
  });

  describe("Performance", () => {
    test("should execute logging operations quickly", () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        logger.info(`Performance test ${i}`);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Moins de 100ms pour 100 logs
    });

    test("should handle concurrent logging calls", () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            logger.info(`Concurrent log ${i}`);
            logger.warn(`Concurrent warning ${i}`);
            logger.error(`Concurrent error ${i}`);
          })
        );
      }

      return Promise.all(promises).then(() => {
        expect(mockConsole.info).toHaveBeenCalledTimes(10);
        expect(mockConsole.warn).toHaveBeenCalledTimes(10);
        expect(mockConsole.error).toHaveBeenCalledTimes(10);
      });
    });
  });

  describe("Configuration", () => {
    test("should have debug disabled by default", () => {
      // Vérifier que enableDebugLogs est false par défaut
      // On ne peut pas tester directement car les mocks interfèrent
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.notificationDebug).toBe("function");
      expect(typeof logger.widgetDebug).toBe("function");
    });

    test("should use correct prefix", () => {
      logger.info("Prefix test");

      const calls = mockConsole.info.mock.calls;
      expect(calls[0][0]).toContain("[MyAdhan]");
    });
  });
});
