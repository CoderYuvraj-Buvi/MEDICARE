import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { connectDB } from './config/db.js';

// ⭐ ADD CLERK MIDDLEWARE
import { clerkMiddleware } from "@clerk/express";
import appointmentRouter from './routes/appointmentRouter.js';
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRoutes.js';
import serviceAppointmentRouter from './routes/serviceAppointmentRouter.js';

const app = express();
const port = process.env.PORT || 4000;

// ⭐ IMPORTANT: ENABLE CREDENTIALS FOR CLERK COOKIE SESSION
// ⭐ Parse and normalize allowed origins
const parseOrigins = () => {
  const defaults = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
  const custom = [process.env.FRONTEND_URL, process.env.ADMIN_URL]
    .filter(Boolean)
    .flatMap((url) => url.split(","))
    .map((url) => url.trim().replace(/\/$/, ""));
  return Array.from(new Set([...defaults, ...custom]));
};

const allowedOrigins = parseOrigins();

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server, curl, Postman (no origin)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        // Allow vercel preview domains if needed
        (process.env.NODE_ENV !== "production" && normalizedOrigin.endsWith(".vercel.app"))
      ) {
        return callback(null, true);
      }

      // Reject politely without throwing an unhandled Express error
      return callback(null, false);
    },
    credentials: true, // REQUIRED for cookies / Clerk
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// ⭐ Use Clerk middleware globally (does NOT protect routes)
app.use(clerkMiddleware());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Database Connection
connectDB();

// Static uploads folder


// Routes (unchanged)
app.use("/api/appointments", appointmentRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);

// Health check and root route
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Medicare API Working' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
});
