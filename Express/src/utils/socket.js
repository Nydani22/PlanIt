let io;

module.exports = {
    init: (httpServer) => {
        const { Server } = require('socket.io');
        io = new Server(httpServer, {
            cors: {
                origin: "http://localhost:4200",
                methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
                credentials: true
            }
        });
        return io;
    },
    getIO: () => {
        if (!io) {
            console.warn("Socket.io még nincs inicializálva!");
        }
        return io;
    }
};