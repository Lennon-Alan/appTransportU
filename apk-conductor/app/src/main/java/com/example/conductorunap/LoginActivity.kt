package com.example.conductorunap

import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityOptionsCompat
import androidx.core.content.edit
import androidx.core.widget.addTextChangedListener
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

class LoginActivity : AppCompatActivity() {

    private val client = OkHttpClient()
    private lateinit var preferences: SharedPreferences

    // Referencias a las vistas
    private lateinit var emailEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var loginButton: Button
    private var progressBar: ProgressBar? = null // Cambio: nullable para evitar crashes

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            Log.d("LoginActivity", "Iniciando LoginActivity...")
            setContentView(R.layout.activity_login)

            preferences = getSharedPreferences("auth", MODE_PRIVATE)

            // Verificar si ya hay sesión activa
            val existingToken = preferences.getString("jwt", null)
            val existingId = preferences.getInt("conductor_id", -1)

            Log.d("LoginActivity", "Token existente: ${if (existingToken != null) "Sí" else "No"}")
            Log.d("LoginActivity", "ID existente: $existingId")

            // Inicializar vistas
            initializeViews()

            // Configurar listeners
            setupListeners()

            // Configurar el manejo del botón de retroceso
            setupBackPressedCallback()

            Log.d("LoginActivity", "LoginActivity inicializada correctamente")

        } catch (e: Exception) {
            Log.e("LoginActivity", "Error en onCreate: ${e.message}")
            Log.e("LoginActivity", "Stack trace: ", e)
        }
    }

    private fun initializeViews() {
        emailEditText = findViewById(R.id.emailEditText)
        passwordEditText = findViewById(R.id.passwordEditText)
        loginButton = findViewById(R.id.loginButton)

        // Manejo seguro del ProgressBar - puede no existir en el layout
        progressBar = try {
            findViewById<ProgressBar>(R.id.progressBar)
        } catch (_: Exception) {
            Log.w("LoginActivity", "ProgressBar no encontrado en el layout")
            null
        }

        // Configurar estado inicial
        loginButton.isEnabled = false
        progressBar?.visibility = View.GONE
    }

    private fun setupListeners() {
        // Validación en tiempo real
        val textWatcher = {
            validateFields()
        }

        emailEditText.addTextChangedListener { textWatcher() }
        passwordEditText.addTextChangedListener { textWatcher() }

        loginButton.setOnClickListener {
            performLogin()
        }
    }

    private fun setupBackPressedCallback() {
        val callback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Prevenir salir accidentalmente durante el login
                if (progressBar?.visibility == View.VISIBLE) {
                    showToast("Espera un momento...")
                    return
                }
                // Permitir el comportamiento normal del botón de retroceso
                finish()
            }
        }
        onBackPressedDispatcher.addCallback(this, callback)
    }

    private fun validateFields() {
        val email = emailEditText.text.toString().trim()
        val password = passwordEditText.text.toString()

        // Validación básica de email
        val isEmailValid = android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
        val isPasswordValid = password.length >= 6

        loginButton.isEnabled = isEmailValid && isPasswordValid

        // Feedback visual mejorado
        if (email.isNotEmpty() && !isEmailValid) {
            emailEditText.error = "Email inválido"
        } else {
            emailEditText.error = null
        }

        if (password.isNotEmpty() && !isPasswordValid) {
            passwordEditText.error = "Mínimo 6 caracteres"
        } else {
            passwordEditText.error = null
        }
    }

    private fun performLogin() {
        val email = emailEditText.text.toString().trim()
        val password = passwordEditText.text.toString()  // ¡Sin trim aquí!

        if (email.isEmpty() || password.isEmpty()) {
            showToast("Completa todos los campos")
            return
        }

        // Mostrar loading
        setLoadingState(true)

        Log.d("LoginDebug", "Email: '$email'")
        Log.d("LoginDebug", "Password: '$password' (length: ${password.length})")

        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        val body = json.toString()
            .toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())

        // Configuración del servidor - cambiar según tu red
        val serverUrl = "http://192.168.100.7:4000/api/auth/login"
        // Alternativas si cambia tu IP:
        // val serverUrl = "http://10.0.2.2:4000/api/auth/login" // Para emulador
        // val serverUrl = "http://tu-ip-actual:4000/api/auth/login" // IP dinámica

        Log.d("LoginDebug", "Intentando conectar a: $serverUrl")

        val request = Request.Builder()
            .url(serverUrl)
            .post(body)
            .addHeader("Content-Type", "application/json")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    setLoadingState(false)
                    showToast("Error de conexión: ${e.message}")
                }
                Log.e("LoginError", "Fallo de red: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                val responseBody = response.body?.string()
                Log.d("LoginResponse", "Código: ${response.code}")
                Log.d("LoginResponse", "Cuerpo: $responseBody")

                runOnUiThread {
                    setLoadingState(false)

                    if (response.isSuccessful && responseBody != null) {
                        handleSuccessfulLogin(responseBody)
                    } else {
                        handleLoginError(responseBody)
                    }
                }
            }
        })
    }

    private fun handleSuccessfulLogin(responseBody: String) {
        try {
            Log.d("LoginSuccess", "Respuesta del servidor: $responseBody")

            val jsonResponse = JSONObject(responseBody)
            val token = jsonResponse.getString("token")
            val id = jsonResponse.getInt("id")

            Log.d("LoginSuccess", "Token obtenido: ${token.take(20)}...")
            Log.d("LoginSuccess", "ID obtenido: $id")

            // Usar KTX extension function para SharedPreferences
            preferences.edit {
                putString("jwt", token)
                putInt("conductor_id", id)
            }

            // Verificar que se guardó correctamente
            val savedToken = preferences.getString("jwt", null)
            val savedId = preferences.getInt("conductor_id", -1)
            Log.d("LoginSuccess", "Token guardado: ${savedToken?.take(20)}...")
            Log.d("LoginSuccess", "ID guardado: $savedId")

            showToast("¡Bienvenido!")

            // Pequeña animación antes de cambiar de actividad
            loginButton.postDelayed({
                try {
                    Log.d("LoginSuccess", "Iniciando MainActivity...")

                    // Verificar que MainActivity existe
                    val intent = Intent(this@LoginActivity, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK

                    // Verificar que se puede resolver la actividad
                    if (intent.resolveActivity(packageManager) != null) {
                        val options = ActivityOptionsCompat.makeCustomAnimation(
                            this@LoginActivity,
                            android.R.anim.fade_in,
                            android.R.anim.fade_out
                        )

                        startActivity(intent, options.toBundle())
                        finish()
                    } else {
                        Log.e("LoginSuccess", "MainActivity no se puede resolver")
                        showToast("Error: MainActivity no encontrada")
                    }

                } catch (e: Exception) {
                    Log.e("LoginSuccess", "Error al iniciar MainActivity: ${e.message}")
                    Log.e("LoginSuccess", "Stack trace: ", e)
                    showToast("Error al abrir la aplicación")
                }
            }, 500)

        } catch (e: Exception) {
            Log.e("LoginParseError", "Error al parsear JSON: ${e.message}")
            Log.e("LoginParseError", "Respuesta recibida: $responseBody")
            showToast("Error inesperado del servidor")
        }
    }

    private fun handleLoginError(responseBody: String?) {
        val errorMsg = try {
            JSONObject(responseBody ?: "{}").getString("message")
        } catch (_: Exception) {
            "Credenciales incorrectas"
        }

        showToast(errorMsg)

        // Animación de error sutil
        loginButton.animate()
            .translationX(-10f)
            .setDuration(50)
            .withEndAction {
                loginButton.animate()
                    .translationX(10f)
                    .setDuration(50)
                    .withEndAction {
                        loginButton.animate()
                            .translationX(0f)
                            .setDuration(50)
                            .start()
                    }
                    .start()
            }
            .start()
    }

    private fun setLoadingState(isLoading: Boolean) {
        loginButton.isEnabled = !isLoading

        // Manejo seguro del ProgressBar
        progressBar?.visibility = if (isLoading) View.VISIBLE else View.GONE

        // Cambiar texto del botón
        loginButton.text = if (isLoading) "Iniciando sesión..." else "Iniciar Sesión"

        // Deshabilitar campos mientras carga
        emailEditText.isEnabled = !isLoading
        passwordEditText.isEnabled = !isLoading
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}