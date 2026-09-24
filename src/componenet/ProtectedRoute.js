import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuthToken, getAuthUser } from "../authStorage";
import { getAppBootstrap } from "../saasApi";
import { getPostLoginPath } from "../utils/saasNavigation";


function getCurrentAppPath() {
  const rawPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const publicUrl = String(process.env.PUBLIC_URL || "").trim();
  if (!publicUrl) return rawPath;

  let basePath = "";
  try {
    basePath = new URL(publicUrl, window.location.origin).pathname.replace(/\/+$/, "");
  } catch (_error) {
    basePath = publicUrl.startsWith("/") ? publicUrl.replace(/\/+$/, "") : "";
  }

  if (basePath && rawPath.toLowerCase().startsWith(basePath.toLowerCase())) {
    return rawPath.slice(basePath.length).replace(/\/+$/, "") || "/";
  }
  return rawPath;
}

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  skipSubscriptionCheck = false,
}) => {
  const token = getAuthToken();
  const user  = getAuthUser();
  const [redirectPath, setRedirectPath] = useState("");
  const [checking, setChecking] = useState(Boolean(token && user && !skipSubscriptionCheck));

  useEffect(() => {
    if (!token || !user || skipSubscriptionCheck) {
      setChecking(false);
      return;
    }

    let mounted = true;

    async function verifyAccess() {
      try {
        const bootstrap = await getAppBootstrap();
        const nextPath = getPostLoginPath(bootstrap);
        const currentPath = getCurrentAppPath();

        if (
          nextPath !== "/admin" &&
          nextPath.replace(/\/+$/, "") !== currentPath
        ) {
          setRedirectPath(nextPath);
        }
      } catch (_error) {
        setRedirectPath("/login");
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    verifyAccess();

    return () => {
      mounted = false;
    };
  }, [skipSubscriptionCheck, token, user]);


  if(!token || !user){
    return <Navigate to="/login" replace />;

  }

  if(
    allowedRoles.length > 0 && !allowedRoles.includes(user.role)
  ){
    if(user.role === "superAdmin" || user.role === "superadmin"){
      return <Navigate to="/superadmin" replace />
    }

    return <Navigate to="/admin" replace />
  }

  if (checking) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}


export default ProtectedRoute;
