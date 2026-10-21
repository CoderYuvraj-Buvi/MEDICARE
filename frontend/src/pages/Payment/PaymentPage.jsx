import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@clerk/clerk-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Phone,
  CreditCard,
  Lock,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Stethoscope,
  Activity,
  ChevronRight,
  Wallet,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();

  const appointmentId =
    searchParams.get("appointmentId") || searchParams.get("id");
  const appointmentType = searchParams.get("type") || "doctor"; // "doctor" | "service"

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [resolvedType, setResolvedType] = useState(appointmentType);
  const [selectedMethod, setSelectedMethod] = useState("one_click");

  // Load appointment details
  const fetchAppointmentDetails = useCallback(async () => {
    if (!appointmentId) {
      setError("No appointment ID was provided in the payment request.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let headers = {};
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Could not retrieve Clerk token for payment fetch:", e);
    }

    try {
      // First attempt using the specified type
      let endpoint =
        resolvedType === "service"
          ? `${API_BASE}/api/service-appointments/${appointmentId}`
          : `${API_BASE}/api/appointments/${appointmentId}`;

      let res = await axios.get(endpoint, { headers, timeout: 12000 }).catch(() => null);

      // If failed and was doctor, try service as fallback, or vice versa
      if (!res || !res.data?.success) {
        const fallbackType = resolvedType === "service" ? "doctor" : "service";
        const fallbackEndpoint =
          fallbackType === "service"
            ? `${API_BASE}/api/service-appointments/${appointmentId}`
            : `${API_BASE}/api/appointments/${appointmentId}`;

        const fallbackRes = await axios
          .get(fallbackEndpoint, { headers, timeout: 12000 })
          .catch(() => null);

        if (fallbackRes?.data?.success) {
          res = fallbackRes;
          setResolvedType(fallbackType);
        }
      }

      if (res && res.data?.success) {
        const data = res.data.appointment || res.data.data;
        setAppointment(data);
      } else {
        setError(
          "We could not find the appointment details. It may have been removed or expired."
        );
      }
    } catch (err) {
      console.error("PaymentPage fetch error:", err);
      setError(
        err?.response?.data?.message ||
          "Network error while loading appointment information."
      );
    } finally {
      setLoading(false);
    }
  }, [appointmentId, resolvedType, isSignedIn, getToken]);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [fetchAppointmentDetails]);

  // Handle Complete Payment button click
  const handleCompletePayment = async () => {
    if (processing || success) return;
    setProcessing(true);

    let headers = { "Content-Type": "application/json" };
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Could not retrieve Clerk token for payment confirmation:", e);
    }

    try {
      const endpoint =
        resolvedType === "service"
          ? `${API_BASE}/api/service-appointments/${appointmentId}/pay`
          : `${API_BASE}/api/appointments/${appointmentId}/pay`;

      const fallbackConfirmUrl =
        resolvedType === "service"
          ? `${API_BASE}/api/service-appointments/confirm`
          : `${API_BASE}/api/appointments/confirm`;

      let response = null;

      // Try the /:id/pay endpoint first
      try {
        response = await axios.post(
          endpoint,
          { appointmentId },
          { headers, timeout: 15000 }
        );
      } catch (err1) {
        console.warn("First pay endpoint failed, attempting /confirm fallback:", err1);
        response = await axios.post(
          fallbackConfirmUrl,
          { appointmentId },
          { headers, timeout: 15000 }
        );
      }

      if (response && response.data?.success) {
        setSuccess(true);
        toast.success("Payment completed successfully!", {
          position: "top-center",
          autoClose: 1800,
        });

        setTimeout(() => {
          if (resolvedType === "service") {
            navigate("/appointments?service_payment=Paid", { replace: true });
          } else {
            navigate("/appointments?payment_status=Paid", { replace: true });
          }
        }, 1200);
      } else {
        const errMsg =
          response?.data?.message || "Payment processing failed. Please try again.";
        toast.error(errMsg, { position: "top-center" });
        setError(errMsg);
      }
    } catch (err) {
      console.error("Payment error:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "An unexpected error occurred while completing the payment.";
      toast.error(errMsg, { position: "top-center" });
      setError(errMsg);
    } finally {
      setProcessing(false);
    }
  };

  // Helper getters for normalized appointment info
  const title =
    resolvedType === "service"
      ? appointment?.serviceName || appointment?.serviceId?.name || "Medical Service"
      : appointment?.doctorName ||
        appointment?.doctorId?.name ||
        "Healthcare Specialist";

  const subtitle =
    resolvedType === "service"
      ? "Diagnostic & Clinical Service"
      : appointment?.speciality ||
        appointment?.doctorId?.specialization ||
        appointment?.doctorId?.speciality ||
        "Medical Practitioner";

  const image =
    resolvedType === "service"
      ? appointment?.serviceImageUrl ||
        appointment?.serviceId?.imageUrl ||
        appointment?.serviceId?.image ||
        ""
      : appointment?.doctorImage?.url ||
        appointment?.doctorId?.imageUrl ||
        appointment?.doctorId?.image ||
        "";

  const fee =
    appointment?.fees ??
    appointment?.fee ??
    appointment?.payment?.amount ??
    appointment?.amount ??
    0;

  const dateStr = appointment?.date || "Date scheduled";
  const timeStr =
    appointment?.time ||
    (appointment?.hour !== undefined
      ? `${appointment.hour}:${String(appointment.minute || 0).padStart(2, "0")} ${appointment.ampm || ""}`
      : "Time scheduled");

  const patientName = appointment?.patientName || "Patient";
  const mobile = appointment?.mobile || "";

  const isAlreadyPaid =
    appointment?.payment?.status === "Paid" ||
    (appointment?.status === "Confirmed" && appointment?.payment?.method === "Online");

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-teal-50/40 to-slate-50 text-slate-800 flex flex-col font-sans">
      <ToastContainer />
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Appointments
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span>256-Bit SSL Secured</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 shadow-xl border border-emerald-100 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800">
              Loading Payment Details...
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Retrieving your appointment and billing summary.
            </p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && !appointment && (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-rose-100 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Payment Error
            </h2>
            <p className="text-sm text-slate-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={fetchAppointmentDetails}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-md"
              >
                Retry
              </button>
              <Link
                to="/appointments"
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-all"
              >
                Go to Appointments
              </Link>
            </div>
          </div>
        )}

        {/* Already Paid State */}
        {!loading && appointment && isAlreadyPaid && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl border border-emerald-100 text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Already Paid & Confirmed
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              This appointment has already been paid for and confirmed. You are all set!
            </p>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-left mb-6 text-sm">
              <p className="text-emerald-900 font-semibold mb-1">{title}</p>
              <p className="text-emerald-700 text-xs mb-2">{subtitle}</p>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-emerald-200/60">
                <span>Date: {dateStr}</span>
                <span>Time: {timeStr}</span>
              </div>
            </div>

            <Link
              to="/appointments"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              View in My Appointments <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Active Payment Screen */}
        {!loading && appointment && !isAlreadyPaid && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-50 mb-3 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  Instant Direct Payment
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Complete Your Booking Payment
                </h1>
                <p className="text-emerald-100 text-sm sm:text-base mt-1 max-w-xl">
                  One-click instant payment verification. Click below to complete your payment and confirm your appointment.
                </p>
              </div>

              <div className="relative z-10 flex flex-col items-center sm:items-end">
                <span className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">
                  Amount Due
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-sm">
                  ₹{fee}
                </span>
              </div>

              {/* Decorative background glow */}
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Appointment & Patient Details (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Doctor / Service Card */}
                <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {resolvedType === "service" ? (
                      <Activity className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Stethoscope className="w-5 h-5 text-emerald-600" />
                    )}
                    {resolvedType === "service"
                      ? "Service Details"
                      : "Doctor Information"}
                  </h2>

                  <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center pb-6 border-b border-slate-100">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50 border-2 border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                      {image ? (
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-emerald-600 font-bold text-xl">
                          {title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                      <p className="text-sm font-medium text-emerald-700">
                        {subtitle}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {dateStr}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          {timeStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="pt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Patient Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <User className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Patient Name</p>
                          <p className="font-semibold text-slate-800">
                            {patientName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Mobile Number</p>
                          <p className="font-semibold text-slate-800">
                            {mobile || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assurance / Trust Banner */}
                <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-3xl p-5 flex items-center gap-4 text-emerald-900">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Instant Confirmation Guarantee</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Your booking status changes to Confirmed immediately upon clicking the payment button. Receipts are saved automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Checkout & Payment Actions (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                    <span>Payment Method</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Direct Pay
                    </span>
                  </h3>

                  {/* Payment Options list */}
                  <div className="space-y-3 mb-6">
                    {/* Option 1: 1-Click Pay */}
                    <div
                      onClick={() => setSelectedMethod("one_click")}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                        selectedMethod === "one_click"
                          ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedMethod === "one_click"
                              ? "border-emerald-600"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedMethod === "one_click" && (
                            <div className="w-2 h-2 rounded-full bg-emerald-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">
                            Instant 1-Click Payment
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Seamlessly complete the payment without external redirects.
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Card / UPI Simulation */}
                    <div
                      onClick={() => setSelectedMethod("demo_upi")}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                        selectedMethod === "demo_upi"
                          ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedMethod === "demo_upi"
                              ? "border-emerald-600"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedMethod === "demo_upi" && (
                            <div className="w-2 h-2 rounded-full bg-emerald-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">
                            Card / UPI / NetBanking
                          </span>
                          <CreditCard className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Test demo gateway (instant authorization).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-6 text-sm border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {resolvedType === "service" ? "Service Fee" : "Consultation Fee"}
                      </span>
                      <span>₹{fee}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform & Booking Fee</span>
                      <span className="text-emerald-700 font-semibold">FREE</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes & GST</span>
                      <span className="text-slate-500 text-xs">Included</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-slate-900">
                      <span>Total Amount</span>
                      <span className="text-emerald-700">₹{fee}</span>
                    </div>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Main Action Button */}
                  <button
                    onClick={handleCompletePayment}
                    disabled={processing || success}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
                      processing || success
                        ? "bg-emerald-400 text-white cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white hover:shadow-emerald-500/25"
                    }`}
                  >
                    {processing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Payment...</span>
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Payment Completed!</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>Complete Payment • ₹{fee}</span>
                      </>
                    )}
                  </button>

                  {/* Cancel / Pay Later Link */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() =>
                        navigate("/appointments?payment_status=Pending")
                      }
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                      Pay later or return to appointments
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
