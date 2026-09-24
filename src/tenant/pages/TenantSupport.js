import React, { useState } from "react";
import { FaPhoneAlt, FaEnvelope, FaComments, FaPaperPlane } from "react-icons/fa";

const TenantSupport = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    issueType: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("✅ Support request submitted successfully!");
    setForm({ name: "", email: "", issueType: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT SIDE */}
          <div className="bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-100 text-gray-900 p-10 flex flex-col justify-center items-center rounded-3xl shadow-inner">
            <div className="w-full max-w-4xl space-y-8 text-center">
              <h2 className="text-5xl font-extrabold tracking-wide text-gray-900 mb-3 drop-shadow-sm">
                Tenant Support
              </h2>

              <p className="text-gray-700 text-lg leading-relaxed">
                Need assistance with your stay? Our support team is available around the clock to help you.
              </p>

              {/* PHONE, EMAIL, LIVE CHAT IN ONE LINE */}
             <div className="mt-10 flex justify-between items-center gap-4 overflow-x-auto w-full">
  {/* PHONE */}
  <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-200 flex-shrink-0 w-64">
    <FaPhoneAlt className="text-blue-700 text-2xl" />
    <div>
      <p className="text-gray-800 font-semibold text-base">Phone</p>
      <p className="text-sm text-gray-600">+91 98765 43210</p>
    </div>
  </div>

  {/* EMAIL */}
  <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-200 flex-shrink-0 w-64">
    <FaEnvelope className="text-blue-700 text-2xl" />
    <div>
      <p className="text-gray-800 font-semibold text-base">Email</p>
      <p className="text-sm text-gray-600">support@hostelhub.in</p>
    </div>
  </div>

  {/* LIVE CHAT */}
  {/* <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-200 flex-shrink-0 w-64">
    <FaComments className="text-blue-700 text-2xl" />
    <div>
      <p className="text-gray-800 font-semibold text-base">Live Chat</p>
      <p className="text-sm text-gray-600">Chat instantly with our support team</p>
    </div>
  </div> */}
</div>


              <div className="mt-10 text-sm text-gray-600">
                24/7 Assistance • Quick Response • Trusted Help
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          {/* <div className="p-10 flex flex-col justify-center bg-white">
            <h3 className="text-3xl font-semibold text-gray-800 mb-4 text-center">
              Submit a Support Request
            </h3>
            <p className="text-gray-500 text-center mb-8">
              Fill in your details and describe your issue. Our support team will respond quickly.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full Name"
                required
                className="w-full p-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email Address"
                required
                className="w-full p-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />

              <select
                name="issueType"
                value={form.issueType}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-xl border border-gray-300 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="">Select Issue Type</option>
                <option value="maintenance">🛠️ Maintenance Issue</option>
                <option value="billing">💳 Billing / Payment Issue</option>
                <option value="room">🛏️ Room / Facility Issue</option>
                <option value="other">📩 Other</option>
              </select>

              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Describe your issue..."
                rows="4"
                required
                className="w-full p-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <FaPaperPlane /> Submit Request
              </button>
            </form>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default TenantSupport;

