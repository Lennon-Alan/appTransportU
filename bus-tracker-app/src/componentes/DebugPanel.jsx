// src/componentes/DebugPanel.jsx
import { useEffect, useState } from "react";
import socket from "../socket/socket";

export default function DebugPanel() {
  const [messages, setMessages] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Escuchar todos los eventos del socket
    const originalOnevent = socket.onevent;
    socket.onevent = function(packet) {
      const args = packet.data || [];
      const eventName = args[0];
      const data = args[1];
      
      // Registrar el mensaje
      const timestamp = new Date().toLocaleTimeString();
      setMessages(prev => [...prev.slice(-49), { // Mantener solo los últimos 50 mensajes
        id: Date.now(),
        timestamp,
        event: eventName,
        data: data
      }]);
      
      // Llamar al handler original
      originalOnevent.call(this, packet);
    };

    // Eventos de conexión
    socket.on("connect", () => {
      setSocketConnected(true);
      setMessages(prev => [...prev.slice(-49), {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: "connect",
        data: "Socket conectado"
      }]);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setMessages(prev => [...prev.slice(-49), {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: "disconnect",
        data: "Socket desconectado"
      }]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      // Restaurar el onevent original
      socket.onevent = originalOnevent;
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  const formatData = (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  const getEventColor = (event) => {
    switch (event) {
      case 'connect': return '#4CAF50';
      case 'disconnect': return '#f44336';
      case 'ubicacion_actualizada': return '#2196F3';
      default: return '#666';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 2000,
          background: socketConnected ? '#4CAF50' : '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          cursor: 'pointer',
          fontSize: '20px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}
      >
        🐛
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      height: '500px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        background: '#f5f5f5',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
          Socket Debug - {socketConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
        <div>
          <button
            onClick={clearMessages}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              marginRight: '5px',
              cursor: 'pointer'
            }}
          >
            Limpiar
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: '#f44336',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        {messages.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', marginTop: '20px' }}>
            No hay mensajes aún...
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{
              marginBottom: '10px',
              padding: '8px',
              border: '1px solid #eee',
              borderRadius: '4px',
              borderLeft: `4px solid ${getEventColor(msg.event)}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '5px'
              }}>
                <span style={{
                  fontWeight: 'bold',
                  color: getEventColor(msg.event)
                }}>
                  {msg.event}
                </span>
                <span style={{ color: '#666', fontSize: '10px' }}>
                  {msg.timestamp}
                </span>
              </div>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '100px',
                overflow: 'auto',
                background: '#f9f9f9',
                padding: '4px',
                borderRadius: '2px'
              }}>
                {formatData(msg.data)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}