package com.example.conductorunap

import android.Manifest
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.socket.client.Socket

class MainActivity : AppCompatActivity() {

    private val locationPermissionCode = 1001
    private lateinit var preferences: SharedPreferences
    private lateinit var socketStatusTextView: TextView
    private lateinit var welcomeMessageTextView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            Log.d("MainActivity", "Iniciando MainActivity...")
            setContentView(R.layout.activity_main)
            Log.d("MainActivity", "Layout cargado exitosamente")

            preferences = getSharedPreferences("auth", MODE_PRIVATE)

            val token = preferences.getString("jwt", null)
            val conductorId = preferences.getInt("conductor_id", -1)

            Log.d("MainActivity", "Token: ${if (token != null) "Presente" else "Ausente"}")
            Log.d("MainActivity", "Conductor ID: $conductorId")

            if (token == null || conductorId == -1) {
                Log.w("MainActivity", "Usuario no autenticado, redirigiendo al login")
                redirectToLogin()
                return
            }

            initializeViews()

        } catch (e: Exception) {
            Log.e("MainActivity", "Error en onCreate: ${e.message}")
            showToast("Error al inicializar la aplicación")
        }
    }

    private fun initializeViews() {
        try {
            val startButton = findViewById<Button>(R.id.startTrackingButton)
            val stopButton = findViewById<Button>(R.id.stopTrackingButton)
            socketStatusTextView = findViewById(R.id.socketStatusTextView)
            welcomeMessageTextView = findViewById(R.id.welcomeMessageTextView)

            val logoutButton = findViewById<Button>(R.id.logoutButton)

            logoutButton.setOnClickListener {
                cerrarSesion()
            }


            val socket = SocketHandler.getSocket()
            updateSocketStatus(SocketHandler.isConnected())

            socket.on(Socket.EVENT_CONNECT) {
                runOnUiThread { updateSocketStatus(true) }
            }

            socket.on(Socket.EVENT_DISCONNECT) {
                runOnUiThread { updateSocketStatus(false) }
            }

            socket.on(Socket.EVENT_CONNECT_ERROR) {
                runOnUiThread { updateSocketStatus(false) }
            }

            val nombre = preferences.getString("nombre", "Conductor") ?: "Conductor"
            val mensaje = obtenerMensajeMotivador(nombre)
            welcomeMessageTextView.text = mensaje

            if (!hasLocationPermissions()) {
                requestLocationPermissions()
            }

            startButton.setOnClickListener {
                if (hasLocationPermissions()) {
                    startLocationService()
                } else {
                    requestLocationPermissions()
                }
            }

            stopButton.setOnClickListener {
                stopLocationService()
            }

        } catch (e: Exception) {
            Log.e("MainActivity", "Error al inicializar vistas: ${e.message}")
            showToast("Error al cargar la interfaz")
        }
    }

    private fun updateSocketStatus(connected: Boolean) {
        if (::socketStatusTextView.isInitialized) {
            socketStatusTextView.text = if (connected) {
                "📡 Enviando ubicación al servidor"
            } else {
                "⚠️ Problema de conexión con el servidor"
            }
            socketStatusTextView.setTextColor(
                ContextCompat.getColor(
                    this,
                    if (connected) android.R.color.holo_green_dark else android.R.color.holo_red_dark
                )
            )
        }
    }

    private fun redirectToLogin() {
        try {
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        } catch (e: Exception) {
            Log.e("MainActivity", "Error al redirigir al login: ${e.message}")
        }
    }

    private fun hasLocationPermissions(): Boolean {
        return try {
            val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
            val bg = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            } else PackageManager.PERMISSION_GRANTED

            fine == PackageManager.PERMISSION_GRANTED &&
                    coarse == PackageManager.PERMISSION_GRANTED &&
                    bg == PackageManager.PERMISSION_GRANTED
        } catch (e: Exception) {
            Log.e("MainActivity", "Error verificando permisos: ${e.message}")
            false
        }
    }

    private fun requestLocationPermissions() {
        try {
            val permissions = mutableListOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val alreadyGranted = ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) == PackageManager.PERMISSION_GRANTED

                if (!alreadyGranted) {
                    Toast.makeText(
                        this,
                        "Para rastreo en segundo plano, otorga 'Permitir siempre'",
                        Toast.LENGTH_LONG
                    ).show()

                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", packageName, null)
                    }
                    startActivity(intent)
                    return
                }
            }

            ActivityCompat.requestPermissions(
                this,
                permissions.toTypedArray(),
                locationPermissionCode
            )
        } catch (e: Exception) {
            Log.e("MainActivity", "Error solicitando permisos: ${e.message}")
            showToast("Error al solicitar permisos")
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        try {
            if (requestCode == locationPermissionCode && hasLocationPermissions()) {
                startLocationService()
            } else {
                Toast.makeText(this, "Permisos de ubicación requeridos", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Error en onRequestPermissionsResult: ${e.message}")
        }
    }

    private fun startLocationService() {
        try {
            val serviceClass = try {
                Class.forName("com.example.conductorunap.LocationService")
                LocationService::class.java
            } catch (e: ClassNotFoundException) {
                Log.e("MainActivity", "LocationService no encontrado: ${e.message}")
                showToast("Servicio de ubicación no disponible")
                return
            }

            val socket = SocketHandler.getSocket()
            if (SocketHandler.isConnected()) {
                val conductorId = preferences.getInt("conductor_id", -1)
                socket.emit("conductor_activado", conductorId)
                Log.d("MainActivity", "📡 Emitido conductor_activado con ID: $conductorId")
            }

            val intent = Intent(this, serviceClass)
            ContextCompat.startForegroundService(this, intent)
            Toast.makeText(this, "🟢 Seguimiento iniciado", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Log.e("MainActivity", "Error iniciando LocationService: ${e.message}")
            showToast("Error al iniciar el seguimiento")
        }
    }

    private fun stopLocationService() {
        try {
            val serviceClass = try {
                Class.forName("com.example.conductorunap.LocationService")
                LocationService::class.java
            } catch (e: ClassNotFoundException) {
                Log.e("MainActivity", "LocationService no encontrado para detener")
                showToast("Servicio de ubicación no disponible")
                return
            }

            val intent = Intent(this, serviceClass)
            stopService(intent)
            Toast.makeText(this, "🔴 Seguimiento detenido", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Log.e("MainActivity", "Error deteniendo LocationService: ${e.message}")
            showToast("Error al detener el seguimiento")
        }
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun obtenerMensajeMotivador(nombre: String): String {
        val frases = listOf(
            "¡Hola $nombre! Que tengas una excelente jornada. 🚍",
            "$nombre, recuerda conducir con calma y paciencia. 🙏",
            "Gracias por tu labor, $nombre. ¡Tú haces la diferencia! 🌟",
            "¡Buen día $nombre! Que todos tus viajes sean seguros. 🛣️",
            "¡Ánimo $nombre! Cada pasajero cuenta contigo. 👨‍👩‍👧‍👦",
            "$nombre, tu responsabilidad es admirable. ¡Gracias! 💚"
        )
        return frases.random()
    }
    private fun cerrarSesion() {
        try {
            val editor = preferences.edit()
            editor.clear()
            editor.apply()

            Toast.makeText(this, "Sesión cerrada", Toast.LENGTH_SHORT).show()

            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        } catch (e: Exception) {
            Log.e("MainActivity", "Error al cerrar sesión: ${e.message}")
            showToast("Error al cerrar sesión")
        }
    }

}
