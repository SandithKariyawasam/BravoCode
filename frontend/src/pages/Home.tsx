// client/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CreateProjectModal from '../components/CreateProjectModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { currentUser } = useAuth()!;
  const { theme, toggleTheme, colors } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [activeTab, setActiveTab] = useState("my"); // 'my' | 'shared' | 'settings'
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
    if (!currentUser) return null;

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
      return newProject.id;

    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Check console for details.");
      return null;
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

  const fetchRequests = async () => {
    if (!currentUser) return;
    let allRequests: any[] = [];
    const myProjects = projects.filter(p => p.ownerId === currentUser.uid);

    for (const project of myProjects) {
      try {
        const res = await fetch(`http://localhost:5000/api/project/${project.id}/requests`);
        if (res.ok) {
          const reqs = await res.json();
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
      fetchRequests();
      alert(`Request ${action}ed`);
    } catch (e) {
      alert("Failed to process request");
    }
  };


  // Web Projects for Sidebar (Own + Shared)
  const webProjects = projects.filter(p =>
    p.language === 'web' &&
    (p.ownerId === currentUser?.uid || (p.members && p.members.includes(currentUser?.uid)))
  );

  // Filter projects based on active tab (EXCLUDING Web Projects)
  const displayedProjects = projects.filter(p => {
    if (!currentUser) return false;
    // Exclude web projects from main grid
    if (p.language === 'web') return false;

    if (activeTab === 'my') return p.ownerId === currentUser.uid;
    if (activeTab === 'shared') return p.members && p.members.includes(currentUser.uid) && p.ownerId !== currentUser.uid;
    return true;
  });

  const handleCreateWebSandbox = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const newId = await handleCreateProject(`Web Sandbox ${timestamp}`, "HTML/CSS/JS Playground", "web");
    if (newId) {
      navigate(`/editor/${newId}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.background }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreateWebProject={handleCreateWebSandbox}
        webProjects={webProjects}
      />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

        {activeTab === 'settings' ? (
          /* SETTINGS VIEW */
          <div style={{ maxWidth: '800px', margin: '0 auto', color: colors.text }}>
            <h1 style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>Settings</h1>

            {/* Appearance Section */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Appearance</h2>
              <div style={{
                backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '6px',
                padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>Theme Preference</h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.9rem' }}>
                    Choose how BravoCode looks to you.
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  style={{
                    backgroundColor: colors.hover, border: `1px solid ${colors.border}`,
                    color: colors.text, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>
            </section>

            {/* Account Section */}
            <section>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: colors.buttonDanger }}>Danger Zone</h2>
              <div style={{
                border: `1px solid ${colors.buttonDanger}`, borderRadius: '6px',
                padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>Delete Account</h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.9rem' }}>
                    Permanently remove your account and all associated data.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const confirmation = prompt("To delete your account, type 'DELETE' below. This cannot be undone.");
                    if (confirmation !== 'DELETE') return;

                    try {
                      const res = await fetch(`http://localhost:5000/api/user/${currentUser?.uid}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requesterId: currentUser?.uid })
                      });

                      if (res.ok) {
                        alert("Account deleted.");
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
                    backgroundColor: 'transparent', border: `1px solid ${colors.buttonDanger}`,
                    color: colors.buttonDanger, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  Delete My Account
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <>
            {/* Requests Section */}
            {requests.length > 0 && activeTab === 'my' && (
              <div style={{ marginBottom: '2rem', backgroundColor: colors.cardBg, padding: '15px', borderRadius: '6px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ marginTop: 0, color: colors.text }}>Incoming Join Requests</h3>
                {requests.map((req, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, padding: '10px 0' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: colors.buttonPrimary }}>{req.displayName}</span>
                      <span style={{ color: colors.textSecondary }}> wants to join </span>
                      <span style={{ fontWeight: 'bold', color: colors.text }}>{req.projectTitle}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleRequestAction(req.projectId, req.userId, 'accept')} style={{ backgroundColor: colors.buttonSuccess, color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Accept</button>
                      <button onClick={() => handleRequestAction(req.projectId, req.userId, 'reject')} style={{ backgroundColor: colors.buttonDanger, color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 style={{ color: colors.text, margin: 0 }}>Dashboard</h1>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter Project ID..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  style={{
                    padding: '10px', backgroundColor: colors.background, border: `1px solid ${colors.border}`,
                    color: colors.text, borderRadius: '6px'
                  }}
                />
                <button
                  onClick={handleSearch}
                  style={{
                    backgroundColor: colors.buttonPrimary, color: 'white', border: 'none',
                    padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  Join
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    backgroundColor: colors.buttonSuccess, color: 'white', border: 'none',
                    padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  + New Project
                </button>
              </div>
            </div>

            {/* Project Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {displayedProjects.length === 0 ? (
                <p style={{ color: colors.textSecondary }}>
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
          </>
        )}

        {/* The Modal */}
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateProject}
          loading={loading}
        />
      </div>
    </div>
  );
};

const ProjectCard = ({ title, desc, lang, onClick }: { title: string, desc: string, lang: string, onClick: () => void }) => {
  const { colors } = useTheme();
  return (
    <div onClick={onClick} style={{
      backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '6px',
      padding: '1.5rem', color: colors.textSecondary, cursor: 'pointer', transition: '0.2s'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: colors.buttonPrimary }}>{title}</h3>
      <p style={{
        color: colors.textSecondary,
        fontSize: '0.9rem',
        marginBottom: '1rem',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>{desc}</p>
      <span style={{ fontSize: '0.8rem', border: `1px solid ${colors.border}`, padding: '2px 8px', borderRadius: '10px', color: colors.textSecondary }}>
        {lang}
      </span>
    </div>
  );
};

export default Dashboard;