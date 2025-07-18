// src/controllers/trackingController.js
const pool = require('../config/db');

exports.saveLocation = async (data) => {
  const { id, lat, lng, velocidad } = data;

  console.time(`DB-${id}`); // inicio del cronómetro

  try {
    await pool.query(
      `INSERT INTO ubicaciones_conductores (conductor_id, posicion, velocidad)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)`,
      [id, lng, lat, velocidad || 0]
    );

    await pool.query(
      `INSERT INTO ultima_ubicacion_conductor (conductor_id, posicion, velocidad)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
       ON CONFLICT (conductor_id)
       DO UPDATE SET
         posicion = EXCLUDED.posicion,
         velocidad = EXCLUDED.velocidad,
         updated_at = now()`,
      [id, lng, lat, velocidad || 0]
    );

    console.timeEnd(`DB-${id}`); // mide cuánto se demoró
    console.log(`✅ Ubicación actualizada: ID ${id}, (${lat}, ${lng})`);
  } catch (error) {
    console.error("❌ Error al guardar ubicación:", error.message);
  }
};
