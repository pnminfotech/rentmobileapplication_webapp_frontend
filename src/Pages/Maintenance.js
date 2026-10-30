//https://chatgpt.com/c/67c7fff1-a5a4-8000-a37d-5619da480851
import React, { useState, useEffect } from "react"; import axios from "axios"; import Modal from "react-modal";
import { useNavigate } from "react-router-dom"; import { BsFileEarmarkPdfFill } from "react-icons/bs";
import { Briefcase , Eye , LayoutDashboard , Pencil  } from "lucide-react"; import Sidebar from "./Sidebar";
import "../Pages/khata.css"; import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const Maintenance = () => {
  const [form, setForm] = useState({ heading: "", date: "", description: "", totalAmount: "",  remainingAmount: "", image: null, });
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("add");
  const [editProject, setEditProject] = useState(null);
  const [search, setSearch] = useState(""); // Search state
  const navigate = useNavigate();

  const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
  const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

  const isAllowedImageFile = (file) => {
    if (!file) return false;

    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "");
    const dotIndex = name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";

    return ALLOWED_IMAGE_MIME_TYPES.has(mime) && ALLOWED_IMAGE_EXTENSIONS.has(ext);
  };

  useEffect(() => {
    axios
      .get("   https://rentmobile-api.pnminfotech.com/api/projects")
      .then((res) => setProjects(res.data))
      .catch((err) => console.error("Error fetching projects:", err));
  }, []);

  const handleSubmit =        async (e) => {
    e.preventDefault();
    
    console.log("Form Data Before Sending:", form); // Debugging

    if (form.image && !isAllowedImageFile(form.image)) {
      alert("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }
  
    const formData = new FormData();
    formData.append("heading", form.heading);
    formData.append("date", form.date);
    formData.append("description", form.description);
    if (form.totalAmount) formData.append("totalAmount", form.totalAmount);
    if (form.remainingAmount) formData.append("remainingAmount", form.remainingAmount);
    if (form.image) formData.append("image", form.image);
  
    try {
      const res = await axios.post(
        "   https://rentmobile-api.pnminfotech.com/api/emp/projects",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      console.log("Response from API:", res.data); // Debugging
      setProjects([...projects, res.data]);
      setForm({ heading: "", date: "", description: "", totalAmount: "", remainingAmount: "", image: "" });
    } catch (err) {
      console.error("Error adding project:", err.response?.data || err);
    }
  };

  const handleEditClick = (project) => {
    setEditProject(project._id);
    setForm({
      heading: project.heading,
      date: project.date,
      description: project.description,
      totalAmount: project.totalAmount,
      remainingAmount: project.remainingAmount,
      image: null, // Image won't be prefilled
    });
  }; 

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (form.image && !isAllowedImageFile(form.image)) {
      alert("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("heading", form.heading);
    formData.append("date", form.date);
    formData.append("description", form.description);
    formData.append("totalAmount", form.totalAmount);
    formData.append("remainingAmount", form.remainingAmount);
    if (form.image) formData.append("image", form.image);

    try {
      const res = await axios.put(
        `   https://rentmobile-api.pnminfotech.com/api/projects/${editProject}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setProjects(projects.map(p => (p._id === editProject ? res.data : p)));
      setEditProject(null);
      setForm({ heading: "", date: "", description: "", totalAmount: "", remainingAmount: "", image: null });
    } catch (err) {
      console.error("Error updating project:", err.response?.data || err);
    }
  };
   // Filter projects based on search input
  const filteredProjects = projects.filter((project) =>
    project.heading?.toLowerCase().includes(search.toLowerCase())
  );
   // Function to generate CSV and download
  const downloadReport = () => {
    const csvContent = [
      ["Heading", "Date", "Description"], // CSV headers
      ...filteredProjects.map((project) => [
        project.heading,
        project.date.split("T")[0],
        project.description,
      ]),
    ]
      .map((row) => row.join(",")) // Convert to CSV format
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "supplier_report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getChartData = (status = { completed: 90 }) => [
    { name: "Completed", value: status.completed },
    { name: "Remaining", value: 70 - status.completed },
  ];

  const COLORS = ["#4a4545", "#9b7b88"];
  return (
    <div className="page" style={{ display: "flex", background: "#fff" }}>
      <Sidebar />
     <div className="content" style={{ marginLeft: "206px", padding: "20px", flex: 1 }}>

{view === "list" ? (
 <div className="list-container">
   <h3 className="dashboard-title">  <Briefcase  size={30} /> <span></span>Create A Projects</h3>
          <div className="top-bar">
            <input
              type="text"
              placeholder="Search supplier by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-bar"
            />
            <button onClick={downloadReport} className="download-btn">
            <BsFileEarmarkPdfFill />Download 
            </button>
            <div className="toggle-buttons">
          <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
          + Add 
          </button>
          <button onClick={() => setView("add")} className={view === "add" ? "active" : ""}>
          <Eye size={24} /> View 
          </button>
        </div>
          </div>
<div className="form-container1"> 
<form onSubmit={handleSubmit} encType="multipart/form-data">
          <input
            type="text"
            placeholder="Project Name"
            value={form.heading}
            onChange={(e) => setForm({ ...form, heading: e.target.value })}
            required
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Total Amount (optional)"
            value={form.totalAmount}
            onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
          />
          <input
            type="number"
            placeholder="Remaining Amount (optional)"
            value={form.remainingAmount}
            onChange={(e) => setForm({ ...form, remainingAmount: e.target.value })}
          />
         <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => setForm({ ...form, image: e.target.files[0] })}/>
          <button type="submit">Add Project</button>
        </form>
</div>
</div>
         
        ) : (
          <div className="list-container">
          <h3 className="dashboard-title">  <Briefcase  size={30} /> <span></span>All Projects</h3>
          <div className="top-bar">
            <input
              type="text"
              placeholder="Search supplier by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-bar"
            />
            <button onClick={downloadReport} className="download-btn">
            <BsFileEarmarkPdfFill />Download 
            </button>
            <div className="toggle-buttons">
          <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
          + Add 
          </button>
          <button onClick={() => setView("add")} className={view === "add" ? "active" : ""}>
          <Eye size={24} /> View 
          </button>
        </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Project</th>
                <th>Date</th>
                <th>Description</th>
                <th>Total -Amt</th>
                <th>Remaining</th>
                <th>Action</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project._id}>
                  <td> {project.image && (
    <img 
    src={project.image 
      ? `   https://rentmobile-api.pnminfotech.com//uploads/${project.image}` 
      : `../image/houseRom.jpeg`}     
       alt="Project"
      style={{ 
        width: "80px", 
        height: "80px", 
        borderRadius: "50%", // Makes it circular
        objectFit: "cover",  // Ensures the image is properly cropped inside the circle
        display: "block", 
        margin: "0 auto" // Centers the image horizontally
      }}
      onError={(e) => e.target.src = `../image/houseRom.jpeg`} // Hide if image not found
    />
  )}</td>
                  <td style={{color: 'rgb(45 55 72)', fontSize: '20px', 


fontFamily: '"Delius", cursive',
fontWeight: 500,
fontStyle: 'normal',
                  }}>{project.heading} </td>
                  <td><strong>{project.date.split("T")[0]}</strong></td>
                  <td>{project.description}</td>
                  <td style={{color: '#2d3748' , fontWeight: 700}}>{project.totalAmount}</td>
                  <td>{project.remainingAmount}</td>
                  <td>
                    <button onClick={() => navigate(`/project/${project._id}`)} className="btn-34">
                    <LayoutDashboard size={24} color="#020000"  />

                    </button>
                    <button  onClick={() => handleEditClick(project)} className="btn-34">
                    <Pencil  size={24} color="#020000"  />
                    </button>
                  </td>
                  <td>
                  <ResponsiveContainer width={50} height={50}>
          <PieChart>
            <Pie
              data={getChartData(project.status)}
              cx="50%"
              cy="50%"
              innerRadius={15}
              outerRadius={25}
              fill="#8884d8"
              paddingAngle={3}
              dataKey="value"
            >
              {getChartData(project.status).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

       {editProject && (
        <form onSubmit={handleUpdate} encType="multipart/form-data">
          <h3>Edit Project</h3>
          <input type="text" placeholder="Heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} required />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input type="number" placeholder="Total Amount" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
          <input type="number" placeholder="Remaining Amount" value={form.remainingAmount} onChange={(e) => setForm({ ...form, remainingAmount: e.target.value })} />
          <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
          <button type="submit">Update</button>
        </form>
      )}
        </div>
        )}
      </div>

      
    </div>
  );
};

export default Maintenance;
