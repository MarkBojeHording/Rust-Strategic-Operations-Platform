import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./replitAuth.js";
import { setupVite, serveStatic, log } from "./vite";
import { seedReportTemplates } from "./seed-templates";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup authentication first
try {
  await setupAuth(app);
  console.log("✓ Authentication setup complete");
} catch (error) {
  console.warn(
    "⚠ Authentication setup failed, continuing without auth:",
    error,
  );
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Seed report templates on startup
  await seedReportTemplates();

  // Initialize WebSocket manager for BattleMetrics tracking
  try {
    const { webSocketManager } = await import("./services/websocketManager");
    webSocketManager.connect();
    console.log("BattleMetrics WebSocket manager initialized");
  } catch (error) {
    console.error("Failed to initialize WebSocket manager:", error);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("Request error:", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    log("Setting up Vite development server...");
    try {
      await setupVite(app, server);
      log("Vite development server setup complete");
    } catch (error) {
      console.error("Failed to setup Vite:", error);
    }
  } else {
    log("Serving static files for production");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5001 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const PORT = process.env.PORT || 5001;
  server.listen(
    {
      port: PORT,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${PORT}`);
    },
  );
})();
