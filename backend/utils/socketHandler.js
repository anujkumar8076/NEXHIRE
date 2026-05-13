/** NexHire — Socket.io Handler */

const online = new Map(); // userId → socketId

export const initSocketHandler = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      socket.join(`user:${userId}`);
      online.set(userId, socket.id);
      socket.broadcast.emit("user:online", { userId });
    }

    socket.on("join:jobRoom",  (jobId) => socket.join(`job:${jobId}`));
    socket.on("leave:jobRoom", (jobId) => socket.leave(`job:${jobId}`));

    socket.on("disconnect", () => {
      if (userId) {
        online.delete(userId);
        socket.broadcast.emit("user:offline", { userId });
      }
    });
  });
};

/** Send a real-time notification to a specific user */
export const notifyUser = (io, userId, payload) =>
  io.to(`user:${userId}`).emit("notification:new", payload);

/** Broadcast to everyone watching a job room */
export const broadcastToJobRoom = (io, jobId, event, payload) =>
  io.to(`job:${jobId}`).emit(event, payload);

export const isUserOnline = (userId) => online.has(String(userId));
export const getOnlineUsers = ()      => [...online.keys()];
