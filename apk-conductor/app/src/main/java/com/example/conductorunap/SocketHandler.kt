package com.example.conductorunap

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import java.net.URISyntaxException

object SocketHandler {
    private var socket: Socket? = null
    private const val SERVER_URL = "http://192.168.100.7:4000"

    fun getSocket(): Socket {
        if (socket == null || !socket!!.connected()) {
            try {
                Log.d("SocketHandler", "🔌 Creando nueva conexión WebSocket...")

                val opts = IO.Options().apply {
                    reconnection = true
                    reconnectionAttempts = 5
                    reconnectionDelay = 3000
                    timeout = 5000
                    transports = arrayOf("websocket")
                }

                socket = IO.socket(SERVER_URL, opts)

                socket?.on(Socket.EVENT_CONNECT) {
                    Log.d("SocketHandler", "🔌 ✅ Conectado al servidor WebSocket")
                }

                socket?.on(Socket.EVENT_DISCONNECT) { args ->
                    Log.w("SocketHandler", "❌ Desconectado del servidor WebSocket: ${args.joinToString()}")
                }

                socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                    Log.e("SocketHandler", "⚠️ Error de conexión: ${args.joinToString()}")
                }

                // 🔄 Reemplazo correcto de eventos de reconexión
                socket?.on("reconnect") { args ->
                    Log.d("SocketHandler", "🔄 Reconectado al servidor: ${args.joinToString()}")
                }

                socket?.on("reconnect_error") { args ->
                    Log.e("SocketHandler", "❌ Error de reconexión: ${args.joinToString()}")
                }

                socket?.on("reconnect_failed") {
                    Log.e("SocketHandler", "💀 Falló la reconexión completamente")
                }

                socket?.on("ubicacion_recibida") { args ->
                    Log.d("SocketHandler", "✅ Confirmación del servidor: ${args.joinToString()}")
                }

                socket?.on("error") { args ->
                    Log.e("SocketHandler", "🚨 Error del servidor: ${args.joinToString()}")
                }

                Log.d("SocketHandler", "🚀 Intentando conectar a $SERVER_URL...")
                socket?.connect()

            } catch (e: URISyntaxException) {
                Log.e("SocketHandler", "❌ Error de URI: ${e.message}")
                e.printStackTrace()
            }
        }

        return socket!!
    }

    fun closeConnection() {
        Log.d("SocketHandler", "🔌 Cerrando conexión WebSocket...")
        socket?.disconnect()
        socket?.close()
        socket = null
    }

    fun isConnected(): Boolean {
        return socket?.connected() == true
    }
}
