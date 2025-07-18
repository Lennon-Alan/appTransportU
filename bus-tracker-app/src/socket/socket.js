// src/socket/socket.js
import { io } from "socket.io-client";

// Solo para pruebas locales (mismo Wi-Fi/red)
const socket = io("http://192.168.100.7:4000"); // <- usa tu IP local real

export default socket;
