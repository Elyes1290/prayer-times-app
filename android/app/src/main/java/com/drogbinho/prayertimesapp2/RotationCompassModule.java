package com.drogbinho.prayertimesapp2;

import android.content.Context;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.view.Surface;
import android.view.WindowManager;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * Boussole via TYPE_ROTATION_VECTOR + remap selon inclinaison (à plat / vertical).
 */
public class RotationCompassModule extends ReactContextBaseJavaModule
        implements SensorEventListener, LifecycleEventListener {

    public static final String NAME = "RotationCompassModule";
    public static final String EVENT_HEADING = "RotationCompassHeading";

    private static final float SMOOTH_ALPHA = 0.12f;
    private static final float MIN_FIELD_UT = 18f;
    /** Champ terrestre typique ~25–65 µT ; au-delà = appareils proches. */
    private static final float INTERFERENCE_FIELD_UT = 72f;
    private static final float FIELD_VARIATION_UT = 16f;
    private static final float OUTLIER_REJECT_DEG = 22f;
    private static final int FIELD_HISTORY_SIZE = 12;
    /** Inclinaison : &lt; 45° ou &gt; 135° = téléphone à plat (recommandé Qibla). */
    private static final float FLAT_PITCH_MIN_DEG = 45f;
    private static final float FLAT_PITCH_MAX_DEG = 135f;
    /** Capteur/remap portrait : nord et sud étaient inversés de 180°. */
    private static final float AZIMUTH_CORRECTION_DEG = 180f;

    private final ReactApplicationContext reactContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Nullable
    private SensorManager sensorManager;
    @Nullable
    private Sensor rotationSensor;
    @Nullable
    private Sensor magneticSensor;

    private boolean listening = false;
    private boolean hasSmoothedAzimuth = false;
    private float smoothedAzimuth = 0f;
    private float lastMagneticFieldUt = 0f;
    private final float[] fieldHistory = new float[FIELD_HISTORY_SIZE];
    private int fieldHistoryIndex = 0;
    private int fieldHistoryCount = 0;

    private boolean hasGeoLocation = false;
    private float latitude = 0f;
    private float longitude = 0f;

    public RotationCompassModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void addListener(String eventName) {
        // requis pour NativeEventEmitter
    }

    @ReactMethod
    public void removeListeners(double count) {
        // requis pour NativeEventEmitter
    }

    @ReactMethod
    public void start(double latitude, double longitude) {
        if (Math.abs(latitude) > 0.0001d || Math.abs(longitude) > 0.0001d) {
            hasGeoLocation = true;
            this.latitude = (float) latitude;
            this.longitude = (float) longitude;
        } else {
            hasGeoLocation = false;
        }

        // Toujours réenregistrer (évite l'état bloqué après pause / permission dialog).
        unregisterSensors();

        Context context = getReactApplicationContext();
        sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) {
            return;
        }

        rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        magneticSensor = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);

        if (rotationSensor == null) {
            return;
        }

        hasSmoothedAzimuth = false;
        fieldHistoryIndex = 0;
        fieldHistoryCount = 0;
        int delay = SensorManager.SENSOR_DELAY_UI;
        sensorManager.registerListener(this, rotationSensor, delay);
        if (magneticSensor != null) {
            sensorManager.registerListener(this, magneticSensor, delay);
        }
        listening = true;
    }

    @ReactMethod
    public void stop() {
        unregisterSensors();
    }

    private void unregisterSensors() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        listening = false;
        hasSmoothedAzimuth = false;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            lastMagneticFieldUt = (float) Math.sqrt(x * x + y * y + z * z);
            recordFieldStrength(lastMagneticFieldUt);
            return;
        }

        if (event.sensor.getType() != Sensor.TYPE_ROTATION_VECTOR) {
            return;
        }

        float[] rotationMatrix = new float[9];
        float[] remappedMatrix = new float[9];
        float[] orientation = new float[3];

        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);
        remapForDeviceAttitude(rotationMatrix, remappedMatrix);
        SensorManager.getOrientation(remappedMatrix, orientation);

        float azimuthDeg = (float) Math.toDegrees(orientation[0]);
        azimuthDeg = (azimuthDeg + AZIMUTH_CORRECTION_DEG + 360f) % 360f;
        azimuthDeg = applyDeclination(azimuthDeg);

        final float field = lastMagneticFieldUt;
        final boolean magneticInterference = detectMagneticInterference(field);
        final boolean needsCalibration = field > 0f && field < MIN_FIELD_UT;

        if (hasSmoothedAzimuth && magneticInterference) {
            float spike = shortestAngleDelta(smoothedAzimuth, azimuthDeg);
            if (Math.abs(spike) > OUTLIER_REJECT_DEG) {
                mainHandler.post(
                        () -> emitHeading(smoothedAzimuth, field, needsCalibration, true));
                return;
            }
        }

        if (!hasSmoothedAzimuth) {
            smoothedAzimuth = azimuthDeg;
            hasSmoothedAzimuth = true;
        } else {
            float diff = azimuthDeg - smoothedAzimuth;
            if (diff > 180f) {
                diff -= 360f;
            }
            if (diff < -180f) {
                diff += 360f;
            }
            smoothedAzimuth += diff * SMOOTH_ALPHA;
            if (smoothedAzimuth < 0f) {
                smoothedAzimuth += 360f;
            }
            if (smoothedAzimuth >= 360f) {
                smoothedAzimuth -= 360f;
            }
        }

        final float heading = smoothedAzimuth;

        mainHandler.post(
                () -> emitHeading(heading, field, needsCalibration, magneticInterference));
    }

    private void recordFieldStrength(float fieldUt) {
        if (fieldUt <= 0f) {
            return;
        }
        fieldHistory[fieldHistoryIndex] = fieldUt;
        fieldHistoryIndex = (fieldHistoryIndex + 1) % FIELD_HISTORY_SIZE;
        if (fieldHistoryCount < FIELD_HISTORY_SIZE) {
            fieldHistoryCount++;
        }
    }

    private boolean detectMagneticInterference(float fieldUt) {
        if (fieldUt > INTERFERENCE_FIELD_UT) {
            return true;
        }
        if (fieldHistoryCount < 4) {
            return false;
        }
        float min = Float.MAX_VALUE;
        float max = 0f;
        for (int i = 0; i < fieldHistoryCount; i++) {
            float value = fieldHistory[i];
            if (value <= 0f) {
                continue;
            }
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
        return (max - min) > FIELD_VARIATION_UT;
    }

    private static float shortestAngleDelta(float fromDeg, float toDeg) {
        float diff = toDeg - fromDeg;
        if (diff > 180f) {
            diff -= 360f;
        }
        if (diff < -180f) {
            diff += 360f;
        }
        return diff;
    }

    /** Nord vrai (Qibla) = nord magnétique + déclinaison locale. */
    private float applyDeclination(float magneticAzimuthDeg) {
        if (!hasGeoLocation) {
            return magneticAzimuthDeg;
        }
        try {
            GeomagneticField field =
                    new GeomagneticField(
                            latitude,
                            longitude,
                            0f,
                            System.currentTimeMillis());
            return (magneticAzimuthDeg + field.getDeclination() + 360f) % 360f;
        } catch (Exception ignored) {
            return magneticAzimuthDeg;
        }
    }

    private boolean isDeviceFlat(float[] rotationMatrix) {
        float[] orient = new float[3];
        SensorManager.getOrientation(rotationMatrix, orient);
        float pitchDeg = Math.abs((float) Math.toDegrees(orient[1]));
        return pitchDeg < FLAT_PITCH_MIN_DEG || pitchDeg > FLAT_PITCH_MAX_DEG;
    }

    /**
     * À plat : haut de l'écran = cap (AXIS_X + AXIS_MINUS_Y en portrait).
     * Vertical : remap standard portrait (AXIS_Y + AXIS_MINUS_X).
     */
    private void remapForDeviceAttitude(float[] in, float[] out) {
        int displayRotation = Surface.ROTATION_0;
        WindowManager wm =
                (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
        if (wm != null && wm.getDefaultDisplay() != null) {
            displayRotation = wm.getDefaultDisplay().getRotation();
        }

        boolean flat = isDeviceFlat(in);

        if (flat) {
            switch (displayRotation) {
                case Surface.ROTATION_90:
                    SensorManager.remapCoordinateSystem(
                            in, SensorManager.AXIS_Y, SensorManager.AXIS_X, out);
                    break;
                case Surface.ROTATION_180:
                    SensorManager.remapCoordinateSystem(
                            in,
                            SensorManager.AXIS_MINUS_X,
                            SensorManager.AXIS_MINUS_Y,
                            out);
                    break;
                case Surface.ROTATION_270:
                    SensorManager.remapCoordinateSystem(
                            in,
                            SensorManager.AXIS_MINUS_Y,
                            SensorManager.AXIS_MINUS_X,
                            out);
                    break;
                case Surface.ROTATION_0:
                default:
                    SensorManager.remapCoordinateSystem(
                            in, SensorManager.AXIS_X, SensorManager.AXIS_MINUS_Y, out);
                    break;
            }
        } else {
            switch (displayRotation) {
                case Surface.ROTATION_90:
                    SensorManager.remapCoordinateSystem(
                            in, SensorManager.AXIS_Y, SensorManager.AXIS_MINUS_X, out);
                    break;
                case Surface.ROTATION_180:
                    SensorManager.remapCoordinateSystem(
                            in,
                            SensorManager.AXIS_MINUS_X,
                            SensorManager.AXIS_MINUS_Y,
                            out);
                    break;
                case Surface.ROTATION_270:
                    SensorManager.remapCoordinateSystem(
                            in,
                            SensorManager.AXIS_MINUS_Y,
                            SensorManager.AXIS_X,
                            out);
                    break;
                case Surface.ROTATION_0:
                default:
                    SensorManager.remapCoordinateSystem(
                            in, SensorManager.AXIS_Y, SensorManager.AXIS_MINUS_X, out);
                    break;
            }
        }
    }

    private void emitHeading(
            float heading,
            float magneticFieldUt,
            boolean needsCalibration,
            boolean magneticInterference) {
        if (!reactContext.hasActiveReactInstance()) {
            return;
        }
        WritableMap params = Arguments.createMap();
        params.putDouble("heading", heading);
        params.putDouble("magneticFieldUt", magneticFieldUt);
        params.putBoolean("needsCalibration", needsCalibration);
        params.putBoolean("magneticInterference", magneticInterference);
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(EVENT_HEADING, params);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // non utilisé
    }

    @Override
    public void onHostResume() {
        // Le cycle capteur est géré par JS (useFocusEffect / AppState).
    }

    @Override
    public void onHostPause() {
        // Ne pas stop() ici : la pause (dialog permission, etc.) tuait la boussole
        // sans redémarrage côté React.
    }

    @Override
    public void onHostDestroy() {
        stop();
    }
}
