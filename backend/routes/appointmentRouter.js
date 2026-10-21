// routes/appointmentRouter.js
import express from "express";
import patientAuth from "../middlewares/patientAuth.js";

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
  patientAuth,
  createAppointment
);

// 🔥 IMPORTANT: /me MUST COME BEFORE /:id
appointmentRouter.get(
  "/me",
  patientAuth,
  getAppointmentsByPatient
);

appointmentRouter.get(
  "/doctor/:doctorId",
  getAppointmentsByDoctor
);

appointmentRouter.get("/patients/count", getRegisteredUserCount);
appointmentRouter.get("/paitents/count", getRegisteredUserCount); // legacy alias

// Appointment ID routes
appointmentRouter.get("/:id", getAppointmentById);
appointmentRouter.post("/:id/pay", confirmPayment);
appointmentRouter.post("/:id/cancel", cancelAppointment);
appointmentRouter.put("/:id", updateAppointment);


export default appointmentRouter;
