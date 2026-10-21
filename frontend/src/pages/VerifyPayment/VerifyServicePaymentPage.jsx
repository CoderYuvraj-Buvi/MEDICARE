import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const VerifyServicePaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const verifyServicePayment = async () => {
      const params = new URLSearchParams(location.search || "");
      const sessionId =
        params.get("session_id") ||
        params.get("appointmentId") ||
        params.get("id");

      if (
        location.pathname === "/service-appointment/cancel" ||
        params.get("status") === "cancel"
      ) {
        if (!cancelled) {
          navigate("/appointments?service_payment=Cancelled", {
            replace: true,
          });
        }
        return;
      }

      if (!sessionId) {
        if (!cancelled) {
          navigate("/appointments?service_payment=Failed", {
            replace: true,
          });
        }
        return;
      }

      try {
        const res = await axios.get(
          `${API_BASE}/api/service-appointments/confirm`,
          {
            params: { session_id: sessionId, appointmentId: sessionId },
            timeout: 15000,
          }
        );

        if (cancelled) return;

        if (res?.data?.success) {
          // Service payment confirmed
          navigate("/appointments?service_payment=Paid", {
            replace: true,
          });
        } else {
          navigate("/appointments?service_payment=Failed", {
            replace: true,
          });
        }
      } catch (error) {
        console.error("Service payment verification failed:", error);
        if (!cancelled) {
          navigate("/appointments?service_payment=Failed", {
            replace: true,
          });
        }
      }
    };

    verifyServicePayment();

    return () => {
      cancelled = true;
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50/50">
      <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-sm">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Verifying Service Booking...</h2>
        <p className="text-xs text-slate-500 mt-1">Please wait while we confirm your service appointment.</p>
      </div>
    </div>
  );
};

export default VerifyServicePaymentPage;
