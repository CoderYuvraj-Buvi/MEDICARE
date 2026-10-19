// routes/appointmentRouter.js
import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";

import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  getStats,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  
  getRegisteredUserCount,
} from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

/* =========================
   PUBLIC / FIXED ROUTES
   ========================= */

// list appointments
appointmentRouter.get("/", getAppointments);

// payment confirm (supports query param or body)
appointmentRouter.get("/confirm", confirmPayment);
appointmentRouter.post("/confirm", confirmPayment);

// stats
appointmentRouter.get("/stats/summary", getStats);

/* =========================
   AUTHENTICATED ROUTES
   ========================= */

// create appointment
appointmentRouter.post(
  "/",
  clerkMiddleware(),
  requireAuth(),
  createAppointment
);

// 🔥 IMPORTANT: /me MUST COME BEFORE /:id
appointmentRouter.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getAppointmentsByPatient
);

appointmentRouter.get(
  "/doctor/:doctorId",
  getAppointmentsByDoctor
);

appointmentRouter.get("/paitents/count", getRegisteredUserCount); 

// Appointment ID routes
appointmentRouter.get("/:id", getAppointmentById);
appointmentRouter.post("/:id/pay", confirmPayment);
appointmentRouter.post("/:id/cancel", cancelAppointment);
appointmentRouter.put("/:id", updateAppointment);


export default appointmentRouter;
