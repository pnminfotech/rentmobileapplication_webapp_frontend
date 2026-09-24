import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEye,
  faTools,
  faEdit,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import hostelBackground from "../image/hostel-vector-26477303.jpg"; // Adjust the path if necessary

function MainPage() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken"); // Clear token
    window.location.href = "/HostelManager"; // Redirect to login
  };

  const containerStyle = {
    position: "relative",
    width: "100%",
    minHeight: "100vh",
    overflow: "hidden",
  };

  const backgroundStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage: `url(${hostelBackground})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(8px)", // Blur effect for the background
    zIndex: 0,
  };

  const overlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dark overlay for better readability
    zIndex: 1,
  };

  const contentStyle = {
    position: "relative",
    zIndex: 2,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    minHeight: "100vh",
  };

  const headingStyle = {
    color: "#ffffff",
    fontSize: "53px",
    marginBottom: "30px",
    fontWeight: "800",
  };

  const buttonContainerStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "20px",
    flexWrap: "wrap", // Allows buttons to wrap on smaller screens
  };

  const buttonStyle = {
    padding: "15px 30px",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const responsiveButtonStyle = {
    ...buttonStyle,
    width: "100%",
    maxWidth: "250px", // Set a maximum button width for small screens
  };

  return (
    <div style={containerStyle}>
      {/* Background Layer */}
      <div style={backgroundStyle}></div>
      <div style={overlayStyle}></div>

      {/* Content Layer */}
      <div style={contentStyle}>
        <h1 style={headingStyle}>Hostel Payment Management System</h1>

        <div style={buttonContainerStyle}>
          <button
            style={{ ...responsiveButtonStyle, backgroundColor: "#3498db" }}
            onClick={() => handleNavigation("/form")}
          >
            <FontAwesomeIcon icon={faPlus} />
            Add New Entity
          </button>

          <button
            style={{ ...responsiveButtonStyle, backgroundColor: "#2ecc71" }}
            onClick={() => handleNavigation("/add-data")}
          >
            <FontAwesomeIcon icon={faEye} />
            View All Entity
          </button>

          <button
            style={{ ...responsiveButtonStyle, backgroundColor: "rgb(235 173 28)" }}
            onClick={() => handleNavigation("/maintenance-manager")}
          >
            <FontAwesomeIcon icon={faTools} />
            Maintenance
          </button>

          {/* <button
            style={{ ...responsiveButtonStyle, backgroundColor: "rgb(92 104 110)" }}
            onClick={() => handleNavigation("/update-data")}
          >
            <FontAwesomeIcon icon={faEdit} />
            Update Entity
          </button> */}

          <button
            style={{ ...responsiveButtonStyle, backgroundColor: "#e74c3c" }}
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
