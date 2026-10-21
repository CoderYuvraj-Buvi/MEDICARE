import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  clerkPublishableKey ? (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-rose-100">
        <h2 className="text-xl font-bold text-rose-600 mb-2">Configuration Required</h2>
        <p className="text-sm text-slate-600 mb-4">
          The environment variable <code className="bg-slate-100 px-2 py-0.5 rounded text-rose-700">VITE_CLERK_PUBLISHABLE_KEY</code> is missing.
        </p>
        <p className="text-xs text-slate-400">
          Please add your Clerk Publishable Key to your hosting provider's environment variables or local <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> file.
        </p>
      </div>
    </div>
  )
);
