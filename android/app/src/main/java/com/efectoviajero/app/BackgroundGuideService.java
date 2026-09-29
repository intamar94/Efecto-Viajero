package com.efectoviajero.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public class BackgroundGuideService extends Service implements LocationListener {
    public static final String PREFERENCES = "efecto_viajero_background_guide";
    public static final String KEY_ACTIVE = "active";
    public static final String KEY_MUTED = "muted";
    public static final String KEY_NARRATED = "narrated_ids";
    public static final String KEY_LAT = "last_lat";
    public static final String KEY_LON = "last_lon";
    public static final String ACTION_EVENT = "com.efectoviajero.app.BACKGROUND_GUIDE_EVENT";
    public static final String ACTION_START = "com.efectoviajero.app.BACKGROUND_GUIDE_START";
    public static final String ACTION_STOP = "com.efectoviajero.app.BACKGROUND_GUIDE_STOP";
    public static final String ACTION_SET_MUTED = "com.efectoviajero.app.BACKGROUND_GUIDE_MUTE";
    public static final String EXTRA_TRIP_ID = "tripId";
    public static final String EXTRA_POINTS = "points";
    public static final String EXTRA_THRESHOLD = "thresholdMeters";
    public static final String EXTRA_MUTED = "muted";

    private static final String CHANNEL_ID = "efecto_viajero_guide";
    private static final int NOTIFICATION_ID = 8042;
    private static final long LOCATION_INTERVAL_MS = 5_000L;
    private static final float LOCATION_DISTANCE_METERS = 10f;

    private final List<GuidePoint> points = new ArrayList<>();
    private final Set<String> narrated = new HashSet<>();
    private SharedPreferences preferences;
    private LocationManager locationManager;
    private TextToSpeech textToSpeech;
    private boolean voiceReady = false;
    private boolean muted = false;
    private int thresholdMeters = 120;
    private String tripId = "";
    private GuidePoint waitingForVoice;

    @Override
    public void onCreate() {
        super.onCreate();
        preferences = getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        narrated.addAll(preferences.getStringSet(KEY_NARRATED, new HashSet<>()));
        muted = preferences.getBoolean(KEY_MUTED, false);
        textToSpeech = new TextToSpeech(getApplicationContext(), status -> {
            if (status != TextToSpeech.SUCCESS) {
                dispatchError("El teléfono no pudo iniciar la voz del sistema.");
                return;
            }
            int language = textToSpeech.setLanguage(new Locale("es", "ES"));
            if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) {
                dispatchError("Instala una voz en español en los ajustes de texto a voz del teléfono.");
                return;
            }
            voiceReady = true;
            if (waitingForVoice != null) {
                GuidePoint next = waitingForVoice;
                waitingForVoice = null;
                narrate(next);
            }
        });
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopGuide();
            return START_NOT_STICKY;
        }
        if (ACTION_SET_MUTED.equals(action)) {
            muted = intent.getBooleanExtra(EXTRA_MUTED, false);
            preferences.edit().putBoolean(KEY_MUTED, muted).apply();
            return START_STICKY;
        }
        if (ACTION_START.equals(action) && intent != null && intent.hasExtra(EXTRA_POINTS)) {
            tripId = intent.getStringExtra(EXTRA_TRIP_ID);
            thresholdMeters = Math.max(30, intent.getIntExtra(EXTRA_THRESHOLD, 120));
            parsePoints(intent.getStringExtra(EXTRA_POINTS));
            narrated.clear();
            preferences.edit()
                .putString(KEY_TRIP_ID, tripId)
                .putString(KEY_POINTS, intent.getStringExtra(EXTRA_POINTS))
                .putInt(KEY_THRESHOLD, thresholdMeters)
                .putBoolean(KEY_ACTIVE, true)
                .putStringSet(KEY_NARRATED, new HashSet<>())
                .apply();
        } else {
            tripId = preferences.getString(KEY_TRIP_ID, "");
            thresholdMeters = preferences.getInt(KEY_THRESHOLD, 120);
            parsePoints(preferences.getString(KEY_POINTS, "[]"));
        }

        if (points.isEmpty()) {
            dispatchError("Este viaje no tiene sitios con coordenadas para la guía.");
            stopSelf();
            return START_NOT_STICKY;
        }

        startAsForeground();
        startLocationUpdates();
        return START_STICKY;
    }

    private void parsePoints(String json) {
        points.clear();
        try {
            JSONArray array = new JSONArray(json == null ? "[]" : json);
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.optJSONObject(i);
                if (item == null) continue;
                String id = item.optString("id", "");
                String name = item.optString("nombre", "");
                String text = item.optString("texto", "");
                if (id.isEmpty() || name.isEmpty() || !item.has("lat") || !item.has("lon")) continue;
                points.add(new GuidePoint(id, name, text, item.optDouble("lat"), item.optDouble("lon")));
            }
        } catch (Exception error) {
            dispatchError("No se pudieron cargar los sitios de la guía.");
        }
    }

    private void startAsForeground() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Guía de viaje", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Indica cuándo la guía GPS está activa.");
            manager.createNotificationChannel(channel);
        }

        Intent stopIntent = new Intent(this, BackgroundGuideService.class).setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Efecto Viajero · guía activa")
            .setContentText("Buscando lugares cercanos y narrándolos en voz alta")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_media_pause, "Detener", stopPending)
            .build();

        int serviceTypes = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            serviceTypes = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                | android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, serviceTypes);
        preferences.edit().putBoolean(KEY_ACTIVE, true).apply();
    }

    private void startLocationUpdates() {
        if (locationManager == null) {
            dispatchError("El servicio de ubicación del teléfono no está disponible.");
            return;
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            dispatchError("Permite la ubicación mientras usas la app para mantener activa la guía.");
            stopGuide();
            return;
        }

        try {
            Criteria criteria = new Criteria();
            criteria.setAccuracy(Criteria.ACCURACY_FINE);
            String provider = locationManager.getBestProvider(criteria, true);
            if (provider == null) {
                dispatchError("Activa la ubicación del teléfono para iniciar la guía.");
                stopGuide();
                return;
            }
            locationManager.requestLocationUpdates(provider, LOCATION_INTERVAL_MS, LOCATION_DISTANCE_METERS, this, Looper.getMainLooper());
            Location last = locationManager.getLastKnownLocation(provider);
            if (last != null) onLocationChanged(last);
        } catch (SecurityException error) {
            dispatchError("Permite la ubicación para mantener activa la guía.");
            stopGuide();
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        preferences.edit()
            .putLong(KEY_LAT, Double.doubleToRawLongBits(location.getLatitude()))
            .putLong(KEY_LON, Double.doubleToRawLongBits(location.getLongitude()))
            .putBoolean(KEY_ACTIVE, true)
            .apply();
        Intent event = new Intent(ACTION_EVENT).setPackage(getPackageName());
        event.putExtra("type", "location");
        event.putExtra("lat", location.getLatitude());
        event.putExtra("lon", location.getLongitude());
        sendBroadcast(event);

        if (muted || (textToSpeech != null && textToSpeech.isSpeaking())) return;
        GuidePoint closest = null;
        float closestDistance = Float.MAX_VALUE;
        float[] result = new float[1];
        for (GuidePoint point : points) {
            if (narrated.contains(point.id)) continue;
            Location.distanceBetween(location.getLatitude(), location.getLongitude(), point.lat, point.lon, result);
            if (result[0] <= thresholdMeters && result[0] < closestDistance) {
                closest = point;
                closestDistance = result[0];
            }
        }
        if (closest != null) {
            if (!voiceReady) waitingForVoice = closest;
            else narrate(closest);
        }
    }

    private void narrate(GuidePoint point) {
        if (muted || narrated.contains(point.id) || textToSpeech == null) return;
        narrated.add(point.id);
        preferences.edit().putStringSet(KEY_NARRATED, new HashSet<>(narrated)).apply();
        textToSpeech.speak(point.text, TextToSpeech.QUEUE_ADD, null, "guide-" + point.id);
        Intent event = new Intent(ACTION_EVENT).setPackage(getPackageName());
        event.putExtra("type", "spoken");
        event.putExtra("id", point.id);
        sendBroadcast(event);
    }

    private void dispatchError(String message) {
        Intent event = new Intent(ACTION_EVENT).setPackage(getPackageName());
        event.putExtra("type", "error");
        event.putExtra("message", message);
        sendBroadcast(event);
    }

    private void stopGuide() {
        if (locationManager != null) locationManager.removeUpdates(this);
        if (textToSpeech != null) textToSpeech.stop();
        waitingForVoice = null;
        preferences.edit().putBoolean(KEY_ACTIVE, false).remove(KEY_POINTS).remove(KEY_TRIP_ID).apply();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) { dispatchError("La ubicación del teléfono se ha desactivado."); }
    @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}

    @Override
    public void onDestroy() {
        if (locationManager != null) locationManager.removeUpdates(this);
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    private static final String KEY_POINTS = "points";
    private static final String KEY_TRIP_ID = "trip_id";
    private static final String KEY_THRESHOLD = "threshold";

    private static final class GuidePoint {
        final String id;
        final String name;
        final String text;
        final double lat;
        final double lon;

        GuidePoint(String id, String name, String text, double lat, double lon) {
            this.id = id;
            this.name = name;
            this.text = text.isEmpty() ? "Estás cerca de " + name + "." : text;
            this.lat = lat;
            this.lon = lon;
        }
    }
}
