// socket/socketHandler.js
const { saveLocation } = require("../controllers/trackingController");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket conectado:", socket.id);

    socket.on("ubicacion", async (data) => {
      await saveLocation(data);
      socket.broadcast.emit("ubicacion_actualizada", data);
    });

    socket.on("disconnect", () => {
      console.log("Socket desconectado:", socket.id);
    });
  });
};
