import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Bus, 
  Clock, 
  Home,
  Calendar,
  Wifi,
  WifiOff,
  Navigation,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Importar socket real (reemplaza la simulación)
import socket from '../socket/socket.js';

// Para el ambiente de Claude, simulamos solo la recepción de datos
// En tu proyecto real, esto sería: import socket from '../socket/socket.js';
const socket = {
  on: (event, callback) => {
    if (event === 'connect') {
      setTimeout(() => callback(), 1000);
    }
    
    if (event === 'disconnect') {
      setTimeout(() => callback(), 2000);
    }
    
    // Simular datos de conductores reales conectados desde sus APKs
    if (event === 'ubicacion_actualizada') {
      const interval = setInterval(() => {
        const mockBus = {
          conductor_id: `conductor_${Math.floor(Math.random() * 3) + 1}`,
          lat: -15.824368264799487 + (Math.random() - 0.5) * 0.01,
          lng: -70.01591306132634 + (Math.random() - 0.5) * 0.01,
          nombre: `Bus ${Math.floor(Math.random() * 3) + 1}`,
          velocidad: Math.random() * 35 + 5,
          timestamp: new Date().toISOString(),
          ruta: ['Universidad - Centro', 'Universidad - Terminal', 'Universidad - Mercado'][Math.floor(Math.random() * 3)]
        };
        callback(mockBus);
      }, 4000 + Math.random() * 3000); // Menos frecuente, más realista
      
      return () => clearInterval(interval);
    }
  },
  
  off: (event) => {
    // Limpiar listeners
  }
};

// Configuración de ubicaciones de Puno
const locations = {
  unaPuno: [-15.824368264799487, -70.01591306132634],
  centroHistorico: [-15.8422, -70.0199],
  mercadoCentral: [-15.8461, -70.0275],
  terminalTerrestre: [-15.8505, -70.0342],
  plazaDeArmas: [-15.8422, -70.0199]
};

// Horarios reales de viernes
const fridaySchedules = [
  { 
    time: "06:30", 
    route: "Universidad - Centro Histórico", 
    frequency: "Cada 15 min", 
    nextBuses: ["06:45", "07:00", "07:15"],
    duration: "25 min"
  },
  { 
    time: "07:00", 
    route: "Universidad - Terminal Terrestre", 
    frequency: "Cada 20 min", 
    nextBuses: ["07:20", "07:40", "08:00"],
    duration: "30 min"
  },
  { 
    time: "07:15", 
    route: "Universidad - Mercado Central", 
    frequency: "Cada 10 min", 
    nextBuses: ["07:25", "07:35", "07:45"],
    duration: "15 min"
  },
  { 
    time: "12:00", 
    route: "Universidad - Centro Histórico", 
    frequency: "Cada 15 min", 
    nextBuses: ["12:15", "12:30", "12:45"],
    duration: "25 min"
  },
  { 
    time: "12:30", 
    route: "Universidad - Terminal Terrestre", 
    frequency: "Cada 20 min", 
    nextBuses: ["12:50", "13:10", "13:30"],
    duration: "30 min"
  },
  { 
    time: "17:00", 
    route: "Universidad - Centro Histórico", 
    frequency: "Cada 12 min", 
    nextBuses: ["17:12", "17:24", "17:36"],
    duration: "25 min"
  },
  { 
    time: "17:30", 
    route: "Universidad - Mercado Central", 
    frequency: "Cada 15 min", 
    nextBuses: ["17:45", "18:00", "18:15"],
    duration: "15 min"
  },
  { 
    time: "18:00", 
    route: "Universidad - Terminal Terrestre", 
    frequency: "Cada 25 min", 
    nextBuses: ["18:25", "18:50", "19:15"],
    duration: "30 min"
  }
];

// Componente de estado de conexión para estudiantes
const ConnectionIndicator = ({ isConnected, activeBuses }) => (
  <div className="fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200">
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Wifi className="w-4 h-4 text-green-600" />
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <WifiOff className="w-4 h-4 text-orange-600" />
        </>
      )}
      <span className="font-medium text-gray-700">{activeBuses} buses</span>
    </div>
  </div>
);

// Componente de navegación inferior
const BottomNavigation = ({ activeView, onViewChange }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
    <div className="flex justify-around items-center py-2">
      <button
        onClick={() => onViewChange('map')}
        className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all ${
          activeView === 'map' 
            ? 'text-blue-600 bg-blue-50 shadow-sm' 
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <MapPin className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium">Mapa</span>
      </button>
      
      <button
        onClick={() => onViewChange('schedule')}
        className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all ${
          activeView === 'schedule' 
            ? 'text-blue-600 bg-blue-50 shadow-sm' 
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <Calendar className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium">Horarios</span>
      </button>
    </div>
  </div>
);

// Componente de tarjeta de bus
const BusCard = ({ bus, isActive }) => (
  <div className={`bg-white rounded-xl p-4 shadow-sm border-l-4 transition-all ${
    isActive ? 'border-green-500 bg-green-50/30' : 'border-gray-300'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Bus className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
        <span className="font-semibold text-gray-800">{bus.nombre}</span>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {isActive ? 'En línea' : 'Desconectado'}
      </span>
    </div>
    
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <span className="text-gray-500">Ruta:</span>
        <p className="font-medium text-gray-800">{bus.ruta}</p>
      </div>
      <div>
        <span className="text-gray-500">Velocidad:</span>
        <p className="font-medium text-gray-800">{(bus.velocidad || 0).toFixed(1)} km/h</p>
      </div>
      <div className="col-span-2">
        <span className="text-gray-500">Última actualización:</span>
        <p className="font-medium text-gray-800">
          {new Date(bus.timestamp).toLocaleTimeString('es-PE', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </p>
      </div>
    </div>
  </div>
);

// Vista del mapa
const MapView = ({ buses, isConnected, activeBuses }) => {
  const isBusActive = (timestamp) => {
    const now = Date.now();
    const busTime = new Date(timestamp).getTime();
    return now - busTime <= 180000; // 3 minutos
  };

  const activeBusList = Object.values(buses).filter(bus => isBusActive(bus.timestamp));
  const inactiveBusList = Object.values(buses).filter(bus => !isBusActive(bus.timestamp));

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100">
      <ConnectionIndicator isConnected={isConnected} activeBuses={activeBuses} />
      
      <div className="w-full h-full flex flex-col items-center justify-start p-4 pt-20">
        {/* Header principal */}
        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mb-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bus className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Buses en Tiempo Real</h1>
            <p className="text-sm text-gray-600">Universidad Nacional del Altiplano</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{activeBuses}</p>
              <p className="text-xs text-green-800">Conectados</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-600">{Object.keys(buses).length}</p>
              <p className="text-xs text-gray-800">Total registrados</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Recibiendo datos:</span>
              <span className={`font-medium flex items-center gap-1 ${
                isConnected ? 'text-green-600' : 'text-orange-600'
              }`}>
                {isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Activo
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Esperando...
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        
        {/* Buses activos */}
        {activeBusList.length > 0 && (
          <div className="max-w-md w-full mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              Conductores conectados
            </h2>
            <div className="space-y-3">
              {activeBusList.map(bus => (
                <BusCard 
                  key={bus.conductor_id} 
                  bus={bus} 
                  isActive={true} 
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Buses inactivos */}
        {inactiveBusList.length > 0 && (
          <div className="max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              Conductores desconectados
            </h2>
            <div className="space-y-3">
              {inactiveBusList.map(bus => (
                <BusCard 
                  key={bus.conductor_id} 
                  bus={bus} 
                  isActive={false} 
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Estado sin buses */}
        {Object.keys(buses).length === 0 && (
          <div className="max-w-md w-full text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600">No hay conductores conectados</p>
            <p className="text-sm text-gray-500 mt-1">
              Esperando que los conductores inicien sus rutas...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Vista de horarios
const ScheduleView = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentTimeString = () => {
    return currentTime.toLocaleTimeString('es-PE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isUpcoming = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduleTime = new Date(currentTime);
    scheduleTime.setHours(hours, minutes, 0, 0);
    return scheduleTime > currentTime;
  };

  const getTimeUntil = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduleTime = new Date(currentTime);
    scheduleTime.setHours(hours, minutes, 0, 0);
    
    if (scheduleTime < currentTime) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }
    
    const diff = scheduleTime - currentTime;
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    }
    return `${minutesLeft}m`;
  };

  const upcomingSchedules = fridaySchedules.filter(schedule => isUpcoming(schedule.time));
  const nextSchedule = upcomingSchedules.length > 0 ? upcomingSchedules[0] : null;

  return (
    <div className="p-4 pb-20 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="max-w-md mx-auto">
        {/* Header con reloj */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-xl">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Horarios - Viernes</h1>
            <p className="text-lg font-mono text-blue-600 mt-2">{getCurrentTimeString()}</p>
          </div>
          
          {nextSchedule && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-1">Próximo bus:</p>
              <p className="font-bold text-blue-900">{nextSchedule.time} - {nextSchedule.route}</p>
              <p className="text-sm text-blue-700">En {getTimeUntil(nextSchedule.time)}</p>
            </div>
          )}
        </div>

        {/* Lista de horarios */}
        <div className="space-y-3">
          {fridaySchedules.map((schedule, index) => {
            const upcoming = isUpcoming(schedule.time);
            const timeUntil = upcoming ? getTimeUntil(schedule.time) : null;
            
            return (
              <div
                key={index}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 transition-all ${
                  upcoming 
                    ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xl font-bold ${
                        upcoming ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {schedule.time}
                      </span>
                      {upcoming && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          En {timeUntil}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{schedule.route}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>📍 {schedule.frequency}</span>
                      <span>⏱️ {schedule.duration}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedSchedule(
                      selectedSchedule === index ? null : index
                    )}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {selectedSchedule === index ? (
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {selectedSchedule === index && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600 mb-2">Próximos buses:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {schedule.nextBuses.map((time, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium text-center"
                        >
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Información del punto de partida */}
        <div className="bg-white rounded-xl p-4 mt-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Navigation className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">
                Punto de partida
              </p>
              <p className="text-xs text-gray-600">
                Universidad Nacional del Altiplano
              </p>
              <p className="text-xs text-gray-500">
                Av. Floral 1153, Puno
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
export default function StudentBusDashboard() {
  const [activeView, setActiveView] = useState('map');
  const [buses, setBuses] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [activeBuses, setActiveBuses] = useState(0);

  // Validación de datos del bus
  const validateBusData = (data) => {
    if (!data || typeof data !== 'object') return false;
    
    const validatedData = {
      conductor_id: String(data.conductor_id || `bus_${Date.now()}`),
      lat: parseFloat(data.lat || -15.824368264799487),
      lng: parseFloat(data.lng || -70.01591306132634),
      nombre: data.nombre || `Bus ${data.conductor_id}`,
      velocidad: parseFloat(data.velocidad || 0),
      timestamp: data.timestamp || new Date().toISOString(),
      ruta: data.ruta || 'Sin ruta asignada'
    };
    
    // Validar coordenadas básicas (área de Puno)
    if (validatedData.lat < -16 || validatedData.lat > -15 || 
        validatedData.lng < -71 || validatedData.lng > -69) {
      console.warn('⚠️ Coordenadas fuera del área de Puno:', validatedData);
    }
    
    return validatedData;
  };

  // Determinar si un bus está activo
  const isBusActive = (timestamp) => {
    const now = Date.now();
    const busTime = new Date(timestamp).getTime();
    return now - busTime <= 180000; // 3 minutos
  };

  // Configurar conexión del socket para estudiantes (solo recepción)
  useEffect(() => {
    console.log('📱 Iniciando app para estudiantes...');
    console.log('🔍 Esperando datos de conductores...');
    
    // Escuchar eventos de conexión al servidor
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('📡 Conectado al servidor - Recibiendo datos');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('📡 Desconectado del servidor');
    });

    // Escuchar actualizaciones de ubicación desde las APKs de conductores
    socket.on('ubicacion_actualizada', (data) => {
      console.log('📍 Datos recibidos del conductor:', data);
      
      const validatedData = validateBusData(data);
      if (!validatedData) {
        console.error('❌ Datos inválidos del conductor:', data);
        return;
      }

      setBuses(prev => ({
        ...prev,
        [validatedData.conductor_id]: validatedData
      }));
    });

    // Limpiar listeners al desmontar
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ubicacion_actualizada');
      console.log('🧹 Cerrando app de estudiantes');
    };
  }, []);

  // Contar buses activos
  useEffect(() => {
    const active = Object.values(buses).filter(bus => isBusActive(bus.timestamp)).length;
    setActiveBuses(active);
  }, [buses]);

  // Limpiar conductores inactivos cada minuto
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setBuses(prev => {
        const filtered = Object.entries(prev)
          .filter(([_, bus]) => now - new Date(bus.timestamp).getTime() <= 600000) // 10 minutos
          .reduce((acc, [key, bus]) => ({
            ...acc,
            [key]: bus
          }), {});
        
        if (Object.keys(filtered).length !== Object.keys(prev).length) {
          console.log('🧹 Limpiando conductores inactivos');
        }
        
        return filtered;
      });
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-50 overflow-hidden">
      {/* Vista del mapa */}
      {activeView === 'map' && (
        <MapView
          buses={buses}
          isConnected={isConnected}
          activeBuses={activeBuses}
        />
      )}

      {/* Vista de horarios */}
      {activeView === 'schedule' && <ScheduleView />}

      {/* Navegación inferior */}
      <BottomNavigation
        activeView={activeView}
        onViewChange={setActiveView}
      />
    </div>
  );
}