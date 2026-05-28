import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import toast  from "react-hot-toast";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

const ICONS = {
  status_update:   "🔔",
  new_application: "📥",
  hiring:          "🎉",
  rejection:       "❌",
};

export const SocketProvider = ({ children }) => {
  const { user }  = useAuth();
  const sockRef   = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  useEffect(() => {
    if (!user) {
      sockRef.current?.disconnect();
      sockRef.current = null;
      return;
    }

    // ✅ FIX: Changed the fallback URL to your live Render backend
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "https://nexhire-backend-br6y.onrender.com",
      { 
        query: { userId: user._id }, 
        transports: ["websocket", "polling"], 
        withCredentials: true 
      }
    );
    sockRef.current = socket;

    socket.on("connect", () => console.log("🔌 Socket:", socket.id));

    socket.on("notification:new", (payload) => {
      const icon = ICONS[payload.type] || "🔔";
      toast.custom(
        (t) => (
          <div className={`${t.visible ? "animate-enter" : "animate-leave"}
            flex items-start gap-3 bg-white border border-gray-100 rounded-2xl
            shadow-xl p-4 max-w-sm w-full`}>
            <span className="text-2xl leading-none mt-0.5">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">NexHire</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{payload.message}</p>
            </div>
          </div>
        ),
        { duration: 5500, position: "top-right" }
      );
      setNotifications((p) => [{ ...payload, isRead: false, createdAt: new Date() }, ...p]);
      setUnreadCount((c) => c + 1);
    });

    socket.on("disconnect", () => console.log("🔌 Disconnected"));

    return () => { socket.disconnect(); sockRef.current = null; };
  }, [user]);

  const joinJobRoom  = (id) => sockRef.current?.emit("join:jobRoom",  id);
  const leaveJobRoom = (id) => sockRef.current?.emit("leave:jobRoom", id);
  const markRead     = ()   => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{
      socket: sockRef.current,
      notifications, unreadCount,
      joinJobRoom, leaveJobRoom, markRead,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);