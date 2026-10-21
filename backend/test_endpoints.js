import 'dotenv/config';
import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import { clerkMiddleware } from "@clerk/express";
import appointmentRouter from './routes/appointmentRouter.js';
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRoutes.js';
import serviceAppointmentRouter from './routes/serviceAppointmentRouter.js';

import Doctor from './models/Doctor.js';
import Service from './models/Service.js';
import Appointment from './models/Appointment.js';
import ServiceAppointment from './models/serviceAppointment.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

app.use("/api/appointments", appointmentRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Medicare API Working' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

async function runTests() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected successfully.\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(4099, resolve));
  const baseUrl = "http://localhost:4099";

  let passed = 0;
  let failed = 0;

  async function assertCase(name, method, path, expectedStatus, options = {}) {
    try {
      const fetchOpts = {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(options.headers || {}),
        },
      };
      if (options.body) fetchOpts.body = JSON.stringify(options.body);

      const res = await fetch(`${baseUrl}${path}`, fetchOpts);
      const isExpected = Array.isArray(expectedStatus) ? expectedStatus.includes(res.status) : res.status === expectedStatus;
      const resBody = await res.json().catch(() => null);

      if (isExpected) {
        passed++;
        console.log(`✅ [PASS] ${method} ${path} -> HTTP ${res.status} (${name})`);
        return { ok: true, status: res.status, body: resBody };
      } else {
        failed++;
        console.error(`❌ [FAIL] ${method} ${path} -> Expected ${expectedStatus}, got HTTP ${res.status} (${name})`);
        console.error("   Response body:", resBody);
        return { ok: false, status: res.status, body: resBody };
      }
    } catch (err) {
      failed++;
      console.error(`💥 [ERROR] ${method} ${path}: ${err.message} (${name})`);
      return { ok: false, status: "ERR", error: err.message };
    }
  }

  console.log("=================================================");
  console.log("PHASE 1: PUBLIC & EDGE CASE VALIDATION TESTS");
  console.log("=================================================\n");

  // Health & Root
  await assertCase("Root API route", "GET", "/", 200);
  await assertCase("Health check route", "GET", "/health", 200);

  // Doctors - Edge cases
  await assertCase("List Doctors", "GET", "/api/doctors", 200);
  await assertCase("Doctor Login - Missing body", "POST", "/api/doctors/login", 400, { body: {} });
  await assertCase("Doctor Login - Invalid creds", "POST", "/api/doctors/login", 401, { body: { email: "fake@test.com", password: "wrong" } });
  await assertCase("Doctor Get - Invalid ObjectId", "GET", "/api/doctors/invalid123", 400);
  await assertCase("Doctor Get - Non-existent ID", "GET", "/api/doctors/507f1f77bcf86cd799439011", 404);
  await assertCase("Doctor Update - No Auth Token", "PUT", "/api/doctors/507f1f77bcf86cd799439011", 401, { body: { name: "Test" } });
  await assertCase("Doctor Toggle Availability - No Auth", "POST", "/api/doctors/507f1f77bcf86cd799439011/toggle-availability", 401);
  await assertCase("Doctor Delete - Invalid ObjectId", "DELETE", "/api/doctors/invalid123", 400);
  await assertCase("Doctor Delete - Non-existent ID", "DELETE", "/api/doctors/507f1f77bcf86cd799439011", 404);

  // Services - Edge cases
  await assertCase("List Services", "GET", "/api/services", 200);
  await assertCase("Service Get - Invalid ObjectId", "GET", "/api/services/invalid123", 400);
  await assertCase("Service Get - Non-existent ID", "GET", "/api/services/507f1f77bcf86cd799439011", 404);
  await assertCase("Service Update - Invalid ObjectId", "PUT", "/api/services/invalid123", 400, { body: { name: "Test" } });
  await assertCase("Service Update - Non-existent ID", "PUT", "/api/services/507f1f77bcf86cd799439011", 404, { body: { name: "Test" } });
  await assertCase("Service Delete - Invalid ObjectId", "DELETE", "/api/services/invalid123", 400);
  await assertCase("Service Delete - Non-existent ID", "DELETE", "/api/services/507f1f77bcf86cd799439011", 404);

  // Appointments - Edge cases
  await assertCase("List Appointments", "GET", "/api/appointments", 200);
  await assertCase("Appointment Stats", "GET", "/api/appointments/stats/summary", 200);
  await assertCase("Patients Count", "GET", "/api/appointments/patients/count", 200);
  await assertCase("Patients Count Alias", "GET", "/api/appointments/paitents/count", 200);
  await assertCase("Patient Appointments - Unauthenticated", "GET", "/api/appointments/me", 401);
  await assertCase("Create Appointment - Unauthenticated", "POST", "/api/appointments", 401, { body: {} });
  await assertCase("Appointment Get - Invalid ID", "GET", "/api/appointments/invalid123", 400);
  await assertCase("Appointment Get - Non-existent ID", "GET", "/api/appointments/507f1f77bcf86cd799439011", 404);
  await assertCase("Appointment Update - Invalid ID", "PUT", "/api/appointments/invalid123", 400, { body: { notes: "hello" } });
  await assertCase("Appointment Cancel - Invalid ID", "POST", "/api/appointments/invalid123/cancel", 400);
  await assertCase("Appointment Confirm - Missing ID", "GET", "/api/appointments/confirm", 400);
  await assertCase("Appointments By Doctor", "GET", "/api/appointments/doctor/507f1f77bcf86cd799439011", 200);

  // Service Appointments - Edge cases
  await assertCase("List Service Appointments", "GET", "/api/service-appointments", 200);
  await assertCase("Service Appointment Stats", "GET", "/api/service-appointments/stats/summary", 200);
  await assertCase("Service Appointments - Unauthenticated", "GET", "/api/service-appointments/me", 401);
  await assertCase("Create Service Appointment - Unauthenticated", "POST", "/api/service-appointments", 401, { body: {} });
  await assertCase("Service Appointment Get - Invalid ID", "GET", "/api/service-appointments/invalid123", 400);
  await assertCase("Service Appointment Get - Non-existent ID", "GET", "/api/service-appointments/507f1f77bcf86cd799439011", 404);
  await assertCase("Service Appointment Update - Invalid ID", "PUT", "/api/service-appointments/invalid123", 400, { body: { notes: "test" } });
  await assertCase("Service Appointment Cancel - Invalid ID", "POST", "/api/service-appointments/invalid123/cancel", 400);
  await assertCase("Service Appointment Confirm - Missing ID", "GET", "/api/service-appointments/confirm", 400);

  console.log("\n=================================================");
  console.log("PHASE 2: FULL CRUD LIFECYCLE & AUTHENTICATION");
  console.log("=================================================\n");

  const testDoctorEmail = `test.dr.${Date.now()}@example.com`;
  const testDoctorPassword = "Password123!";

  // 1. Create a Doctor
  const createDrRes = await assertCase("Create Doctor (POST /api/doctors)", "POST", "/api/doctors", [200, 201], {
    body: {
      name: "Dr. Test Specialist",
      email: testDoctorEmail,
      password: testDoctorPassword,
      specialization: "Cardiologist",
      fee: 500,
      availability: "Available",
      about: "Experienced cardiologist for automated testing.",
    },
  });

  const doctorId = createDrRes.body?.data?.id || createDrRes.body?.data?._id;
  console.log(`Created test doctor ID: ${doctorId}`);

  // 2. Doctor Login & JWT Token issuance
  const loginRes = await assertCase("Doctor Login with created credentials", "POST", "/api/doctors/login", 200, {
    body: {
      email: testDoctorEmail,
      password: testDoctorPassword,
    },
  });
  const doctorToken = loginRes.body?.token;
  console.log(`Issued Doctor JWT Token: ${Boolean(doctorToken)}`);

  // 3. Query Doctor by ID
  await assertCase("Get Doctor by ID", "GET", `/api/doctors/${doctorId}`, 200);

  // 4. Update Doctor using JWT Token
  await assertCase("Update Doctor Profile (with Auth)", "PUT", `/api/doctors/${doctorId}`, 200, {
    headers: { Authorization: `Bearer ${doctorToken}` },
    body: { about: "Updated about section with verified credentials." },
  });

  // 5. Toggle Doctor Availability with JWT Token
  await assertCase("Toggle Doctor Availability (with Auth)", "POST", `/api/doctors/${doctorId}/toggle-availability`, 200, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });

  // 6. Create Service
  const createSvcRes = await assertCase("Create Service (POST /api/services)", "POST", "/api/services", [200, 201], {
    body: {
      name: `Cardiac Checkup Test ${Date.now()}`,
      about: "Comprehensive cardiovascular screening and consultation.",
      price: 1500,
      availability: "Available",
      instructions: ["Fast for 8 hours prior to test", "Wear comfortable clothing"],
    },
  });
  const serviceId = createSvcRes.body?.data?._id || createSvcRes.body?.data?.id;
  console.log(`Created test service ID: ${serviceId}`);

  // 7. Get Service by ID
  await assertCase("Get Service by ID", "GET", `/api/services/${serviceId}`, 200);

  // 8. Update Service
  await assertCase("Update Service (PUT /api/services/:id)", "PUT", `/api/services/${serviceId}`, 200, {
    body: { about: "Updated cardiac test description." },
  });

  // 9. Appointment lifecycle test
  const testAppointment = await Appointment.create({
    owner: doctorId,
    doctorId: doctorId,
    patientName: "John Doe Test",
    mobile: "9876543210",
    email: "john.doe@test.com",
    date: "2026-10-30",
    time: "10:30 AM",
    fees: 500,
    status: "Pending",
    payment: { method: "Cash", status: "Pending" },
    createdBy: "test_clerk_user_123",
  });
  const appointmentId = testAppointment._id.toString();

  await assertCase("Get Appointment by ID", "GET", `/api/appointments/${appointmentId}`, 200);
  await assertCase("Update Appointment Notes", "PUT", `/api/appointments/${appointmentId}`, 200, {
    body: { notes: "Patient requested morning slot confirmation." },
  });
  await assertCase("Confirm Appointment Payment", "POST", `/api/appointments/${appointmentId}/pay`, 200);
  await assertCase("Cancel Appointment", "POST", `/api/appointments/${appointmentId}/cancel`, 200);

  // 10. Service Appointment lifecycle test
  const testSvcAppt = await ServiceAppointment.create({
    serviceId: serviceId,
    serviceName: "Cardiac Checkup Test",
    patientName: "Jane Doe Test",
    mobile: "9876543211",
    date: "2026-10-31",
    time: "11:00 AM",
    hour: 11,
    minute: 0,
    ampm: "AM",
    fees: 1500,
    amount: 1500,
    status: "Pending",
    payment: { method: "Cash", status: "Pending", amount: 1500 },
    createdBy: "test_clerk_user_123",
  });
  const svcApptId = testSvcAppt._id.toString();

  await assertCase("Get Service Appointment by ID", "GET", `/api/service-appointments/${svcApptId}`, 200);
  await assertCase("Update Service Appointment", "PUT", `/api/service-appointments/${svcApptId}`, 200, {
    body: { notes: "Sample collection scheduled." },
  });
  await assertCase("Confirm Service Appointment Payment", "POST", `/api/service-appointments/${svcApptId}/pay`, 200);
  await assertCase("Cancel Service Appointment", "POST", `/api/service-appointments/${svcApptId}/cancel`, 200);

  // 11. Cleanup test records
  console.log("\nCleaning up test records...");
  await Appointment.findByIdAndDelete(appointmentId);
  await ServiceAppointment.findByIdAndDelete(svcApptId);
  await Doctor.findByIdAndDelete(doctorId);
  await Service.findByIdAndDelete(serviceId);
  console.log("Cleanup complete.\n");

  console.log(`========================================`);
  console.log(`TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed out of ${passed + failed} total`);
  console.log(`========================================\n`);

  server.close();
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
