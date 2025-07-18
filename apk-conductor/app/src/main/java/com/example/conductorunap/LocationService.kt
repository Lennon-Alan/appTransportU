package com.example.conductorunap

import android.app.*
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import org.json.JSONObject

class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var lastLat = 0.0
    private var lastLon = 0.0
    private var lastSentTime = 0L
    private var locationCount = 0

    // Configuración de optimización
    private val minDistanceMetersThreshold = 4f   // Solo enviar si se movió más de 4 metros
    private val minTimeMillisThreshold = 4000L    // y pasaron al menos 4 segundos

    override fun onCreate() {
        super.onCreate()
        Log.d("LocationService", "🚀 LocationService creado")
        createNotificationChannel()
        startForeground(1, buildNotification())
        startLocationUpdates()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.d("LocationService", "🛑 LocationService destruido")
        fusedLocationClient.removeLocationUpdates(locationCallback)
        SocketHandler.closeConnection()
        super.onDestroy()
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, "location_channel")
            .setContentTitle("Seguimiento activo")
            .setContentText("📡 Enviando ubicación...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "location_channel",
                "Seguimiento GPS",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            processLocation(location)
        }
    }

    private fun processLocation(location: Location) {
        locationCount++
        val lat = location.latitude
        val lon = location.longitude
        val accuracy = location.accuracy
        val now = System.currentTimeMillis()

        Log.d("LocationService", "📍 Ubicación #$locationCount: $lat, $lon (±$accuracy m)")

        if (lat == 0.0 && lon == 0.0) {
            Log.w("LocationService", "⚠️ Ubicación inválida (0,0)")
            return
        }

        val distance = FloatArray(1)
        Location.distanceBetween(lastLat, lastLon, lat, lon, distance)
        val movedDistance = distance[0]
        val timeSinceLast = now - lastSentTime

        Log.d("LocationService", "📏 Distancia: ${"%.2f".format(movedDistance)} m")
        Log.d("LocationService", "⏱️ Tiempo desde último envío: $timeSinceLast ms")

        if ((lastLat == 0.0 || movedDistance > minDistanceMetersThreshold) &&
            timeSinceLast > minTimeMillisThreshold
        ) {
            lastLat = lat
            lastLon = lon
            lastSentTime = now
            sendLocationToServer(lat, lon, location.speed)
        } else {
            Log.d("LocationService", "⏸️ No se envía (muy cerca o muy rápido)")
        }
    }

    private fun startLocationUpdates() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 4000L) // ideal cada 4s
            .setMinUpdateIntervalMillis(3000L)
            .setMaxUpdateDelayMillis(10000L)
            .setMinUpdateDistanceMeters(minDistanceMetersThreshold)
            .setGranularity(Granularity.GRANULARITY_FINE)
            .setWaitForAccurateLocation(true)
            .build()

        try {
            Log.d("LocationService", "🎯 Iniciando actualizaciones de ubicación")
            fusedLocationClient.requestLocationUpdates(
                request,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e("LocationService", "❌ Error de permisos: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun sendLocationToServer(lat: Double, lon: Double, speed: Float) {
        val prefs = getSharedPreferences("auth", MODE_PRIVATE)
        val token = prefs.getString("jwt", null)
        val id = prefs.getInt("conductor_id", -1)

        if (token == null || id == -1) {
            Log.e("LocationService", "❌ Token o ID inválido")
            return
        }

        val json = JSONObject().apply {
            put("type", "ubicacion")
            put("id", id)
            put("lat", lat)
            put("lng", lon)
            put("velocidad", speed)
            put("token", token)
            put("timestamp", System.currentTimeMillis())
        }

        val socket = SocketHandler.getSocket()
        Log.d("LocationService", "🔌 Socket conectado=${socket.connected()}")

        if (socket.connected()) {
            socket.emit("ubicacion", json)
            Log.d("LocationService", "✅ Ubicación enviada: $json")
        } else {
            Log.e("LocationService", "⚠️ Socket desconectado, intentando reconectar...")
            socket.connect()
        }
    }
}
