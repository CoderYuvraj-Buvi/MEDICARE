import { getAuth } from "@clerk/express";

/**
 * patientAuth middleware for REST API routes.
 * Ensures a valid Clerk user is present on the request.
 * Returns HTTP 401 JSON instead of redirecting (unlike requireAuth which redirects to "/").
 */
export default function patientAuth(req, res, next) {
  try {
    const auth = typeof req.auth === "function" ? req.auth() : (req.auth || getAuth(req));
    const userId = auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in to continue.",
      });
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.error("patientAuth verification error:", err?.message || err);
    return res.status(401).json({
      success: false,
      message: "Authentication verification failed.",
    });
  }
}
