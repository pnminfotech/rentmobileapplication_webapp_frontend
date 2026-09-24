import React from "react";
import {
  Zap,
  CheckCircle,
  AlertTriangle,
  Home,
  Users,
  DollarSign,
  BedDouble,
  UserCheck,
  UserX,
  ClipboardList,
} from "lucide-react";

const DashboardOne = ({ data }) => {
  const dashboardBlocks = [
    {
      icon: <Zap className="w-6 h-6 text-blue-600" />,
      label: "Total Light Bill",
      value: `₹${data.totalLightBill}`,
      bg: "bg-blue-100",
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      label: "Paid Light Bill",
      value: `₹${data.totalPaidLightBill}`,
      bg: "bg-green-100",
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      label: "Pending Light Bill",
      value: `₹${data.totalPendingLightBill}`,
      bg: "bg-red-100",
    },
    {
      icon: <Home className="w-6 h-6 text-purple-600" />,
      label: "Total Maintenance",
      value: `₹${data.totalMaintenance}`,
      bg: "bg-purple-100",
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      label: "Paid Maintenance",
      value: `₹${data.totalPaidMaintenance}`,
      bg: "bg-green-100",
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      label: "Pending Maintenance",
      value: `₹${data.totalPendingMaintenance}`,
      bg: "bg-red-100",
    },
    {
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      label: "Total Tenants",
      value: data.totalTenants,
      bg: "bg-indigo-100",
    },
    {
      icon: <UserCheck className="w-6 h-6 text-green-700" />,
      label: "Occupied Beds",
      value: data.occupiedBeds,
      bg: "bg-green-100",
    },
    {
      icon: <UserX className="w-6 h-6 text-red-700" />,
      label: "Vacant Beds",
      value: data.vacantBeds,
      bg: "bg-red-100",
    },
    {
      icon: <ClipboardList className="w-6 h-6 text-yellow-600" />,
      label: "Pending Rents",
      value: data.pendingRents,
      bg: "bg-yellow-100",
    },
    {
      icon: <DollarSign className="w-6 h-6 text-teal-600" />,
      label: "Deposits Collected",
      value: data.collectedDeposits,
      bg: "bg-teal-100",
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardBlocks.map((block, index) => (
          <div
            key={index}
            className={`rounded-xl p-5 shadow-md flex items-center space-x-4 ${block.bg}`}
          >
            <div className="p-3 bg-white rounded-full shadow">{block.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{block.label}</p>
              <p className="text-xl font-bold text-gray-800">{block.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardOne;
