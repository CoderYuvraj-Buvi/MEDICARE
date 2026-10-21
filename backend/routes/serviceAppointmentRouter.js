// routes/serviceAppointmentRouter.js
import express from "express";
import patientAuth from "../middlewares/patientAuth.js";

import {
  getServiceAppointments,
  getServiceAppointmentById,
  createServiceAppointment,
  confirmServicePayment,
  updateServiceAppointment,
  cancelServiceAppointment,
  getServiceAppointmentStats,
  getServiceAppointmentsByPatient,
} from "../controllers/serviceAppointmentController.js";

const router = express.Router();

/* FIXED ROUTES FIRST */
router.get("/", getServiceAppointments);
router.get("/confirm", confirmServicePayment);
router.post("/confirm", confirmServicePayment);
router.get("/stats/summary", getServiceAppointmentStats);

router.post("/", patientAuth, createServiceAppointment);

// 🔥 MUST BE BEFORE :id
router.get(
  "/me",
  patientAuth,
  getServiceAppointmentsByPatient
);

/* ID ROUTES LAST */
router.get("/:id", getServiceAppointmentById);
router.post("/:id/pay", confirmServicePayment);
router.put("/:id", updateServiceAppointment);
router.post("/:id/cancel", cancelServiceAppointment);

export default router;
