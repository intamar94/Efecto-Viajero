package com.efectoviajero.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Set;
import org.json.JSONArray;

@CapacitorPlugin(name = "BackgroundGuide")
public class BackgroundGuidePlugin extends Plugin {
    private BroadcastReceiver eventReceiver;
    private boolean receiverRegistered = false;

    @Override
    public void load() {
        eventReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String type = intent.getStringExtra("type");
                if (type == null) return;

                JSObject event = new JSObject();
                if ("location".equals(type)) {
                    event.put("lat", intent.getDoubleExtra("lat", 0));
                    event.put("lon", intent.getDoubleExtra("lon", 0));
                    notifyListeners("location", event);
                } else if ("spoken".equals(type)) {
                    event.put("id", intent.getStringExtra("id"));
                    notifyListeners("spoken", event);
                } else if ("error".equals(type)) {
                    event.put("message", intent.getStringExtra("message"));
                    notifyListeners("error", event);
                }
            }
        };
        IntentFilter filter = new IntentFilter(BackgroundGuideService.ACTION_EVENT);
        ContextCompat.registerReceiver(getContext(), eventReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        receiverRegistered = true;
    }

    @PluginMethod
    public void startGuide(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permite el acceso a la ubicación antes de iniciar la guía.");
            return;
        }

        JSONArray points = call.getData().optJSONArray("points");
        String tripId = call.getString("tripId");
        if (points == null || points.length() == 0 || tripId == null || tripId.trim().isEmpty()) {
            call.reject("Este viaje todavía no tiene sitios con ubicación para narrar.");
            return;
        }

        Intent intent = new Intent(getContext(), BackgroundGuideService.class);
        intent.setAction(BackgroundGuideService.ACTION_START);
        intent.putExtra(BackgroundGuideService.EXTRA_TRIP_ID, tripId);
        intent.putExtra(BackgroundGuideService.EXTRA_POINTS, points.toString());
        intent.putExtra(BackgroundGuideService.EXTRA_THRESHOLD, call.getInt("thresholdMeters", 120));

        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo iniciar la guía en segundo plano.", error);
        }
    }

    @PluginMethod
    public void stopGuide(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundGuideService.class);
        intent.setAction(BackgroundGuideService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void setMuted(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundGuideService.class);
        intent.setAction(BackgroundGuideService.ACTION_SET_MUTED);
        intent.putExtra(BackgroundGuideService.EXTRA_MUTED, call.getBoolean("muted", false));
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        android.content.SharedPreferences preferences = getContext().getSharedPreferences(
            BackgroundGuideService.PREFERENCES, Context.MODE_PRIVATE
        );
        JSObject status = new JSObject();
        status.put("active", preferences.getBoolean(BackgroundGuideService.KEY_ACTIVE, false));
        status.put("muted", preferences.getBoolean(BackgroundGuideService.KEY_MUTED, false));
        if (preferences.contains(BackgroundGuideService.KEY_LAT)) {
            status.put("lat", Double.longBitsToDouble(preferences.getLong(BackgroundGuideService.KEY_LAT, 0)));
            status.put("lon", Double.longBitsToDouble(preferences.getLong(BackgroundGuideService.KEY_LON, 0)));
        }
        Set<String> narrated = preferences.getStringSet(BackgroundGuideService.KEY_NARRATED, null);
        status.put("narratedIds", narrated == null ? new ArrayList<>() : new ArrayList<>(narrated));
        call.resolve(status);
    }

    @Override
    protected void handleOnDestroy() {
        if (receiverRegistered && eventReceiver != null) {
            try {
                getContext().unregisterReceiver(eventReceiver);
            } catch (IllegalArgumentException ignored) {
                // Already unregistered by the platform.
            }
            receiverRegistered = false;
        }
        super.handleOnDestroy();
    }
}
