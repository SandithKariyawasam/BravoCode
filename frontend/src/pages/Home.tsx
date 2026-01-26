// client/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CreateProjectModal from '../components/CreateProjectModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
  const { currentUser } = useAuth()!;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);


  useEffect(() => {
    if (!currentUser) return;


    const q = query(
      collection(db, "projects"),
      where("members", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateProject = async (title: string, desc: string, lang: string) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      console.log("Attempting to create project...");

      await addDoc(collection(db, "projects"), {
        title: title,
        description: desc,
        language: lang,
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        code: "// Start coding here...",
        version: 1,
        createdAt: serverTimestamp(),
        lastSaved: serverTimestamp()
      });

      console.log("Project created successfully!");

      setIsModalOpen(false);

    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0D1117' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#C9D1D9', margin: 0 }}>Dashboard</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              backgroundColor: '#238636', color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            + New Project
          </button>
        </div>

        {/* Project Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.length === 0 ? (
            <p style={{ color: '#8B949E' }}>No projects yet. Create one to get started!</p>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                desc={project.description}
                lang={project.language}
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
    </div>
  );
};

const ProjectCard = ({ title, desc, lang }: { title: string, desc: string, lang: string }) => (
  <div style={{
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