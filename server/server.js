const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

io.on("connection", (socket) => {

    socket.on("join-room", ({ roomId, roomExpiry }) => {

        socket.join(roomId);

        if (!rooms.has(roomId)) {
            const expiryTime = Date.now() + roomExpiry;

            const timer = setTimeout(() => {
                io.to(roomId).emit("room-expired");
                io.in(roomId).socketsLeave(roomId);
                rooms.delete(roomId);
            }, roomExpiry);

            rooms.set(roomId, { expiryTime, timer });
        }

        socket.emit("room-joined", {
            roomId,
            expiryTime: rooms.get(roomId).expiryTime
        });
    });

    socket.on("send-message", (data) => {
        io.to(data.roomId).emit("receive-message", data);
    });

});

server.listen(3000, () =>
    console.log("Server running at http://localhost:3000")
);

