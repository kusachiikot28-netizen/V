import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Collaborative editing state (simplified)
  const routeRooms: Record<string, any> = {};

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-route", (routeId) => {
      socket.join(routeId);
      console.log(`User ${socket.id} joined route ${routeId}`);
      if (routeRooms[routeId]) {
        socket.emit("route-update", routeRooms[routeId]);
      }
    });

    socket.on("update-route", ({ routeId, routeData }) => {
      routeRooms[routeId] = routeData;
      socket.to(routeId).emit("route-update", routeData);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
