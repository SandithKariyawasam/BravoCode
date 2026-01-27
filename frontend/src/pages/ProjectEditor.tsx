import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';

const ProjectEditor = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const { currentUser } = useAuth()!; // Need current user to check ownership
    const [code, setCode] = useState("// Loading...");
    const [projectData, setProjectData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);


    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/project/${projectId}`);
                if (!res.ok) throw new Error("Project not found");

                const data = await res.json();
                setProjectData(data);
                setCode(data.code || "");
            } catch (err) {
                console.error("Failed to load project", err);
                alert("Project not found!");
                navigate('/dashboard');
            }
        };

        fetchProject();
    }, [projectId, navigate]);

    const handleSave = async () => {
        if (!projectId) return;
        setSaving(true);
        try {
            const response = await fetch(`http://localhost:5000/api/project/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) throw new Error("Failed to save");

            alert("Saved successfully!");
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save code.");
        } finally {
            setSaving(false);
        }
    };

    const handleRun = async () => {
        if (!code) return;
        setIsRunning(true);
        setOutput("Running...");

        try {
            const response = await fetch('http://localhost:5000/api/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: projectData.language,
                    code: code
                }),
            });

            const data = await response.json();
            if (data.output) {
                setOutput(data.output);
            } else if (data.error) {
                setOutput(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error executing code:", error);
            setOutput("Error: Failed to connect to execution server.");
        } finally {
            setIsRunning(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!projectId || !currentUser) return;
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
            const res = await fetch(`http://localhost:5000/api/project/${projectId}/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: currentUser.uid, memberId })
            });

            if (res.ok) {
                alert("Member removed");
                // Refresh project data
                const projectRes = await fetch(`http://localhost:5000/api/project/${projectId}`);
                const newData = await projectRes.json();
                setProjectData(newData);
            } else {
                const err = await res.json();
                alert(err.error || "Failed to remove member");
            }
        } catch (e) {
            console.error(e);
            alert("Error removing member");
        }
    };

    if (!projectData) return <div style={{ color: 'white', padding: '20px' }}>Loading Project...</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0D1117', color: '#C9D1D9' }}>

            {/* LEFT SIDEBAR: Project Info */}
            <div style={{ width: '250px', backgroundColor: '#161B22', borderRight: '1px solid #30363D', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: '#58A6FF', cursor: 'pointer', textAlign: 'left' }}
                >
                    ← Back to Dashboard
                </button>

                <h3 style={{ margin: '0 0 10px 0', color: '#C9D1D9' }}>{projectData.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#8B949E' }}>{projectData.language}</p>

                <div style={{ marginTop: '20px', flex: 1, overflowY: 'auto' }}>
                    <h4 style={{ color: '#C9D1D9', borderBottom: '1px solid #30363D', paddingBottom: '5px', marginBottom: '10px' }}>Members</h4>

                    {projectData.membersDetails && projectData.membersDetails.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {projectData.membersDetails.map((member: any) => (
                                <div key={member.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#30363D', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#C9D1D9', fontSize: '0.7rem' }}>
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span style={{ color: member.uid === projectData.ownerId ? '#58A6FF' : '#C9D1D9' }}>
                                        {member.name || "Unknown"}
                                    </span>
                                    {member.uid === projectData.ownerId && <span>👑</span>}

                                    {/* Remove Button: Only show if I am owner AND this is not me */}
                                    {currentUser && currentUser.uid === projectData.ownerId && member.uid !== currentUser.uid && (
                                        <button
                                            onClick={() => handleRemoveMember(member.uid)}
                                            style={{
                                                marginLeft: 'auto', background: 'none', border: 'none',
                                                color: '#da3633', cursor: 'pointer', fontSize: '1rem', padding: '0 5px'
                                            }}
                                            title="Remove Member"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Fallback for old projects */
                        <p style={{ color: '#8B949E', fontSize: '0.8rem' }}>
                            {projectData.members ? `${projectData.members.length} member(s)` : 'No members'}
                        </p>
                    )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            width: '100%', padding: '10px',
                            backgroundColor: '#1F6FEB', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Code'}
                    </button>
                </div>
            </div>

            {/* CENTER: Monaco Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Editor Toolbar */}
                <div style={{ height: '40px', backgroundColor: '#0D1117', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        style={{
                            backgroundColor: isRunning ? '#2ea043' : '#238636',
                            color: 'white', border: 'none', padding: '5px 15px',
                            borderRadius: '4px', cursor: isRunning ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold', opacity: isRunning ? 0.7 : 1
                        }}
                    >
                        {isRunning ? 'Running...' : '▶ Run'}
                    </button>
                </div>

                <Editor
                    height="100%"
                    theme="vs-dark"
                    language={projectData.language === 'javascript' ? 'javascript' : 'python'}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                />
            </div>

            {/* RIGHT: Terminal (Placeholder) */}
            <div style={{ width: '30%', backgroundColor: '#010409', borderLeft: '1px solid #30363D', padding: '1rem' }}>
                <p style={{ fontFamily: 'monospace', color: '#8B949E', fontSize: '0.9rem', borderBottom: '1px solid #30363D', paddingBottom: '5px' }}>
                    TERMINAL / OUTPUT
                </p>
                <div style={{ fontFamily: 'monospace', color: '#C9D1D9', marginTop: '10px', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                    {output || "Ready..."}
                </div>
            </div>

        </div>
    );
};

export default ProjectEditor;