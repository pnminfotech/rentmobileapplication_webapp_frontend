// src/App.js
import React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import TenantIntake from './Pages/TenantIntake';
import Form from './componenet/form';
import AddData from './componenet/AddData';
import UpdateData from './componenet/UpdateData';
import Mainpage from './componenet/mainpage';
import DuplicateForm from './componenet/DuplicateForms';
import ProtectedRoute from './componenet/ProtectedRoute';
import FormDownload from './componenet/Maintanace/FormDownload';
import MeterForm from './componenet/Maintanace/MeterForm';
import Ruf from './componenet/rufWork';
import NewYear from './componenet/newyear';
// import Sidebar from './Pages/Sidebar';
import Kahata from './Componen/Kahata';
import Log from './componenet/Log';
import ProjectDashboard from './Pages/ProjectDashboard';
import Dashboard from './Pages/Dashboard';
import Suppliers from './Pages/Suppliers';
import Maintenance from './Pages/Maintenance';
import AdminSidebar from './Pages/AdminSidebar';
import AppEntry from './Pages/AppEntry';
import RegisterBusiness from './Pages/RegisterBusiness';
import TrialUnitSetup from './Pages/TrialUnitSetup';
import PropertyTypes from './Pages/PropertyTypes';
import SubscriptionExpired from './Pages/SubscriptionExpired';
import SuperAdminHome from './Pages/SuperAdminHome';
import Record from './Pages/record';
import MaintenanceManager from './componenet/Maintanace/MaintenanceManager';
import AddDataDemo from './componenet/Add_Data_Demo';
import LightbillMaintenace from './componenet/Maintanace/LightbillMaintance';
import NewComponant from './componenet/NewComponant';
import MainDashboard from './componenet/MainDashboard';
import DashboardNavigation from './componenet/DashboardNavigation';
import NewComponantOriginal from './componenet/NewComponantOriginal';
import LightBillMatrixView from './componenet/Maintanace/LightBillMatrixView';
import LightbillOtherExpenses from './componenet/Maintanace/LightbillOtherExpenses';
import RoomManager from './componenet/RoomManager';
import CommercialManager from './componenet/CommercialManager';
import FormSubmitted from './componenet/FormSubmitted';
import OtherExpense from "./Pages/OtherExpense";
import LightBill from "./Pages/LightBill";
import CanteenSettings from "./Pages/CanteenSettings";
import CanteenAttendance from "./Pages/CanteenAttendance";
import HostelRules from "./Pages/HostelRules";
import ProfileSettings from "./Pages/ProfileSettings";
// ✅ Import your tenant app (the module you shared at top)
import TenantApp from './tenant/TenantApp';
import { api } from './api';
import { hasRecentUserActivity, recordUserActivity } from './userActivity';

function getRouterBasename() {
  const publicUrl = String(process.env.PUBLIC_URL || "").trim();

  if (!publicUrl) return "";

  try {
    return new URL(publicUrl, window.location.origin).pathname.replace(/\/$/, "");
  } catch (_error) {
    return publicUrl.startsWith("/") ? publicUrl.replace(/\/$/, "") : "";
  }
}

function Layout() {
  React.useEffect(() => {
    const events = ["pointerdown", "keydown", "touchstart", "wheel"];
    for (const eventName of events) {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    }
    const activityHeartbeat = window.setInterval(() => {
      if (!localStorage.getItem("authToken") || !hasRecentUserActivity()) return;
      api.post("/saas/auth/session/activity").catch(() => {});
    }, 60 * 1000);
    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, recordUserActivity);
      }
      window.clearInterval(activityHeartbeat);
    };
  }, []);

  return (
    <div className="App">
      <DashboardNavigation />
      <Routes>
        {/* Auth routes */}
        <Route path="/" element={<AppEntry />} />
        <Route path="/login" element={<Log />} />
        <Route path="/register" element={<RegisterBusiness />} />
        <Route path="/register-business" element={<RegisterBusiness />} />
        <Route path="/trial-unit-setup" element={<ProtectedRoute skipSubscriptionCheck><TrialUnitSetup /></ProtectedRoute>} />
        <Route path="/property-types" element={<ProtectedRoute skipSubscriptionCheck><PropertyTypes /></ProtectedRoute>} />
        <Route path="/subscription-expired" element={<ProtectedRoute skipSubscriptionCheck><SubscriptionExpired /></ProtectedRoute>} />

        {/* Public Tenant Form */}
        <Route path="/form" element={<Form />} />
        <Route path="/tenant-intake" element={<TenantIntake />} />
        <Route path="/form-submitted" element={<FormSubmitted />} />

        {/* ✅ Mount the entire tenant module under /tenant/* */}
        <Route path="/tenant/*" element={<TenantApp />} />

        {/* Admin / Protected */}
        <Route path="/add-data" element={<ProtectedRoute><AddData /></ProtectedRoute>} />
        <Route path="/update-data" element={<ProtectedRoute><UpdateData /></ProtectedRoute>} />
        <Route path="/duplicate-data" element={<ProtectedRoute><DuplicateForm /></ProtectedRoute>} />
        <Route path="/Form-download" element={<ProtectedRoute><FormDownload /></ProtectedRoute>} />
        <Route path="/ruf" element={<ProtectedRoute><Ruf /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><NewYear /></ProtectedRoute>} />
        <Route path="/mainpage" element={<ProtectedRoute><Mainpage /></ProtectedRoute>} />
        <Route path="/meter" element={<ProtectedRoute><MeterForm /></ProtectedRoute>} />
        <Route path="/khata" element={<ProtectedRoute><Kahata /></ProtectedRoute>} />
        <Route path="/project/:id" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/setting" element={<ProtectedRoute><AdminSidebar /></ProtectedRoute>} />
        <Route path="/record" element={<ProtectedRoute><Record /></ProtectedRoute>} />

        {/* Maintenance manager and others */}
        <Route path="/maintenance-manager" element={<ProtectedRoute><MaintenanceManager /></ProtectedRoute>} />
        <Route path="/Adddatademo" element={<ProtectedRoute><AddDataDemo /></ProtectedRoute>} />
        <Route path="/lightbillmaintance" element={<ProtectedRoute><LightbillMaintenace /></ProtectedRoute>} />
        <Route path="/lightbillotherexpenses" element={<ProtectedRoute><LightbillOtherExpenses /></ProtectedRoute>} />
        <Route path="/NewComponant" element={<ProtectedRoute><NewComponant /></ProtectedRoute>} />
        <Route path="/tracker/bed" element={<ProtectedRoute><NewComponant /></ProtectedRoute>} />
        <Route path="/tracker/room" element={<ProtectedRoute><NewComponant /></ProtectedRoute>} />
        <Route path="/tracker/shop" element={<ProtectedRoute><NewComponant /></ProtectedRoute>} />
        <Route path="/NewComponantOriginal" element={<ProtectedRoute><NewComponantOriginal /></ProtectedRoute>} />
        <Route
  path="/admin"
  element={
    <ProtectedRoute allowedRoles={["systemadmin", "system_admin"]}>
      <MainDashboard />
    </ProtectedRoute>
  }
/><Route
  path="/maindashboard"
  element={
    <ProtectedRoute allowedRoles={["systemadmin", "system_admin"]}>
      <Navigate to="/admin" replace />
    </ProtectedRoute>
  }
/>

        <Route
  path="/maindashbaord"
  element={<Navigate to="/admin" replace />}
/>
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "superAdmin"]} skipSubscriptionCheck>
              <SuperAdminHome />
            </ProtectedRoute>
          }
        />
        <Route path="/LightBillMatrixView" element={<ProtectedRoute><LightBillMatrixView /></ProtectedRoute>} />
        <Route path="/roommanager" element={<ProtectedRoute><RoomManager /></ProtectedRoute>} />
        <Route path="/commercial-manager" element={<ProtectedRoute><CommercialManager /></ProtectedRoute>} />
        <Route path="/formdownload" element={<ProtectedRoute><FormDownload /></ProtectedRoute>} />


        <Route path="/other-expense" element={<ProtectedRoute><OtherExpense /></ProtectedRoute>} />
        <Route path="/light-bill" element={<ProtectedRoute><LightBill /></ProtectedRoute>} />
        <Route path="/canteen-settings" element={<ProtectedRoute><CanteenSettings /></ProtectedRoute>} />
        <Route path="/canteen-attendance" element={<ProtectedRoute><CanteenAttendance /></ProtectedRoute>} />
        <Route path="/hostel-rules" element={<ProtectedRoute><HostelRules /></ProtectedRoute>} />
        <Route
          path="/profile"
          element={<ProtectedRoute allowedRoles={["systemadmin", "system_admin"]}><ProfileSettings /></ProtectedRoute>}
        />
      </Routes>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename={getRouterBasename()}>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
