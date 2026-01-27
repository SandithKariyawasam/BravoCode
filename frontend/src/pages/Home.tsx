// client/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CreateProjectModal from '../components/CreateProjectModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { currentUser } = useAuth()!;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [activeTab, setActiveTab] = useState("my"); // 'my' | 'shared'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();


  const fetchProjects = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${currentUser.uid}`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentUser]);

  const handleCreateProject = async (title: string, desc: string, lang: string) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      console.log("Attempting to create project via API...");

      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: desc,
          language: lang,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName
        })
      });

      if (!response.ok) throw new Error("Failed to create project");

      const newProject = await response.json();
      console.log("Project created successfully!", newProject);

      // Update list
      setProjects(prev => [...prev, newProject]);
      setIsModalOpen(false);

    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!currentUser || !searchId.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/project/${searchId.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, displayName: currentUser.displayName })
      });

      const data = await response.json();

      if (data.status === 'member' || data.status === 'accepted') {
        // Already a member, go to editor
        navigate(`/editor/${searchId.trim()}`);
      } else if (data.status === 'pending') {
        alert("Join request sent. Waiting for owner approval.");
      } else if (data.status === 'rejected') {
        alert("Your join request was rejected by the owner.");
      } else {
        alert(data.message || "Failed to join project");
      }
    } catch (err) {
      console.error(err);
      alert("Project not found or server error");
    }
  };

  const [requests, setRequests] = useState<any[]>([]);

  // ... (fetchProjects remains same)

  const fetchRequests = async () => {
    if (!currentUser) return;
    // In a real app, we might want an endpoint to get ALL requests for ALL projects owned by user
    // For now, let's just iterate over owned projects (simple but inefficient for many projects)
    // Or better, we only load requests when clicking a specific project? 
    // The user asked for "Owner Dashboard", so showing them upfront is better.
    // Let's rely on displayedProjects (my projects) to fetch requests.

    let allRequests: any[] = [];
    // We only check requests for 'My Projects'
    const myProjects = projects.filter(p => p.ownerId === currentUser.uid);

    for (const project of myProjects) {
      try {
        const res = await fetch(`http://localhost:5000/api/project/${project.id}/requests`);
        if (res.ok) {
          const reqs = await res.json();
          // Tag with project info
          reqs.forEach((r: any) => allRequests.push({ ...r, projectId: project.id, projectTitle: project.title }));
        }
      } catch (e) { console.error(e); }
    }
    setRequests(allRequests);
  };

  useEffect(() => {
    if (activeTab === 'my' && projects.length > 0) {
      fetchRequests();
    }
  }, [projects, activeTab]);

  const handleRequestAction = async (projectId: string, userId: string, action: 'accept' | 'reject') => {
    if (!currentUser) return;
    try {
      await fetch(`http://localhost:5000/api/project/${projectId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ownerId: currentUser.uid })
      });
      // Refresh requests
      fetchRequests();
      // If accepted, we might want to refresh projects too if logic depended on it, but here it's fine.
      alert(`Request ${action}ed`);
    } catch (e) {
      alert("Failed to process request");
    }
  };


  // ... (handleSearch remains same)

  // Filter projects based on active tab
  const displayedProjects = projects.filter(p => {
    if (!currentUser) return false;
    if (activeTab === 'my') return p.ownerId === currentUser.uid;
    // Added safety check for p.members
    if (activeTab === 'shared') return p.members && p.members.includes(currentUser.uid) && p.ownerId !== currentUser.uid;
    return true;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0D1117' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

        {/* Requests Section - Only show if there are requests */}
        {requests.length > 0 && activeTab === 'my' && (
          <div style={{ marginBottom: '2rem', backgroundColor: '#161B22', padding: '15px', borderRadius: '6px', border: '1px solid #30363D' }}>
            <h3 style={{ marginTop: 0, color: '#C9D1D9' }}>Incoming Join Requests</h3>
            {requests.map((req, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363D', padding: '10px 0' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#58A6FF' }}>{req.displayName}</span>
                  <span style={{ color: '#8B949E' }}> wants to join </span>
                  <span style={{ fontWeight: 'bold', color: 'white' }}>{req.projectTitle}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleRequestAction(req.projectId, req.userId, 'accept')} style={{ backgroundColor: '#238636', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Accept</button>
                  <button onClick={() => handleRequestAction(req.projectId, req.userId, 'reject')} style={{ backgroundColor: '#da3633', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#C9D1D9', margin: 0 }}>Dashboard</h1>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter Project ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              style={{
                padding: '10px', backgroundColor: '#0D1117', border: '1px solid #30363D',
                color: 'white', borderRadius: '6px'
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                backgroundColor: '#1F6FEB', color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Join
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                backgroundColor: '#238636', color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              + New Project
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                backgroundColor: '#21262D', color: '#C9D1D9', border: '1px solid #30363D',
                padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Project Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {displayedProjects.length === 0 ? (
            <p style={{ color: '#8B949E' }}>
              {activeTab === 'my' ? "No personal projects yet." : "No shared projects yet."}
            </p>
          ) : (
            displayedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                desc={project.description}
                lang={project.language}
                onClick={() => navigate(`/editor/${project.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* The Modal (Hidden unless isModalOpen is true) */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
        loading={loading}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#161B22', padding: '2rem', borderRadius: '8px', width: '400px', border: '1px solid #30363D' }}>
            <h2 style={{ color: '#C9D1D9', marginTop: 0 }}>Settings</h2>

            <div style={{ marginTop: '20px', borderTop: '1px solid #30363D', paddingTop: '20px' }}>
              <h4 style={{ color: '#da3633', margin: '0 0 10px 0' }}>Danger Zone</h4>
              <button
                onClick={async () => {
                  if (!currentUser) return;
                  const confirmation = prompt("To delete your account, type 'DELETE' below. This cannot be undone.");
                  if (confirmation !== 'DELETE') return;

                  try {
                    const res = await fetch(`http://localhost:5000/api/user/${currentUser.uid}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requesterId: currentUser.uid })
                    });

                    if (res.ok) {
                      alert("Account deleted.");
                      // Sign out and redirect
                      // Note: in valid auth flow, verify connection, but here we force logout
                      navigate('/');
                      window.location.reload();
                    } else {
                      alert("Failed to delete account");
                    }
                  } catch (e) {
                    console.error(e);
                    alert("Error deleting account");
                  }
                }}
                style={{
                  width: '100%', padding: '10px',
                  backgroundColor: 'transparent',
                  border: '1px solid #da3633', borderRadius: '6px',
                  color: '#da3633', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                Delete My Account
              </button>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{
                marginTop: '20px', width: '100%', padding: '10px',
                backgroundColor: '#21262D', color: '#C9D1D9',
                border: '1px solid #30363D', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const ProjectCard = ({ title, desc, lang, onClick }: { title: string, desc: string, lang: string, onClick: () => void }) => (
  <div onClick={onClick} style={{
    backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '6px',
    padding: '1.5rem', color: '#C9D1D9', cursor: 'pointer', transition: '0.2s'
  }}>
    <h3 style={{ margin: '0 0 10px 0', color: '#58A6FF' }}>{title}</h3>
    <p style={{ color: '#8B949E', fontSize: '0.9rem', marginBottom: '1rem' }}>{desc}</p>
    <span style={{ fontSize: '0.8rem', border: '1px solid #30363D', padding: '2px 8px', borderRadius: '10px', color: '#8B949E' }}>
      {lang}
    </span>
  </div>
);

export default Dashboard;