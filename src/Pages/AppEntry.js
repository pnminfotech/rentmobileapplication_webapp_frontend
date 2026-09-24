import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { clearAuthSession, getAuthToken } from "../authStorage";
import { getAppBootstrap } from "../saasApi";
import { getPostLoginPath } from "../utils/saasNavigation";

export default function AppEntry() {
  const navigate = useNavigate();
  const [hasToken] = useState(() => Boolean(getAuthToken()));
  const [checking, setChecking] = useState(hasToken);

  useEffect(() => {
    if (!hasToken) return;

    let mounted = true;

    async function restoreSession() {
      try {
        const bootstrap = await getAppBootstrap();
        if (mounted) {
          navigate(getPostLoginPath(bootstrap), { replace: true });
        }
      } catch (_error) {
        clearAuthSession();
        if (mounted) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [hasToken, navigate]);

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status" />
        <div className="fw-bold text-secondary">
          {checking ? "Opening your workspace..." : "Redirecting..."}
        </div>
      </div>
    </div>
  );
}
