import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';

const WebProjectEditor = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth()!;
    const [projectData, setProjectData] = useState<any>(null);
    const [html, setHtml] = useState("");
    const [css, setCss] = useState("");
    const [js, setJs] = useState("");
    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Live Preview
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // 1. Fetch Project through Backend (Corrects Permission Error)
    // Supports Polling for Real-Time Sync
    const [isLive, setIsLive] = useState(false);
    const [serverLastSaved, setServerLastSaved] = useState<number>(0);

    const fetchProject = async (background = false) => {
        if (!projectId || !currentUser) return;
        try {
            const res = await fetch(`http://localhost:5000/api/project/${projectId}`);
            if (!res.ok) throw new Error("Project not found");
            const data = await res.json();

            if (!background) setProjectData(data); // Don't full re-render on poll

            // Check for updates
            const incomingDate = data.lastSaved ? new Date(data.lastSaved._seconds ? data.lastSaved._seconds * 1000 : data.lastSaved).getTime() : 0;

            if (incomingDate > serverLastSaved) {
                // New update available!
                setServerLastSaved(incomingDate);

                // Only update code if it's different to avoid cursor jumps if identical
                // In a perfect world we diff, but here we just replace if newer
                try {
                    const codeObj = JSON.parse(data.code || "{}");
                    // Only update state if meaningful change to avoid state churn
                    if (codeObj.html !== html) setHtml(codeObj.html || "");
                    if (codeObj.css !== css) setCss(codeObj.css || "");
                    if (codeObj.js !== js) setJs(codeObj.js || "");

                    if (background) console.log("Live Sync: Updated from server");
                } catch (e) {
                    console.error("Error parsing sync code", e);
                }
            }

            if (!background) setLoading(false);
        } catch (err) {
            console.error("Failed to load project", err);
            if (!background) {
                alert("Failed to load project.");
                navigate('/dashboard');
            }
        }
    };

    // Initial Load
    useEffect(() => {
        fetchProject(false);
    }, [projectId, navigate, currentUser]);

    // Polling Loop
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            fetchProject(true);
        }, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
    }, [isLive, serverLastSaved, html, css, js, fetchProject]); // Dependencies needed for comparison logic? Actually fetchProject closes over state? 
    // Wait, if fetchProject is not recreated, it closes over STALE html/css/js constants.
    // I need to be careful. The fetchProject function is defined inside component, so it regenerates on render.
    // So the effect needs to depend on it or it needs to use refs. 
    // Simplified: Just trusting the server timestamp check. If server is newer, I overwrite.
    // This is "Last Write Wins" (Server Wins).

    // 2. Update Preview (Debounced)
    const [srcDoc, setSrcDoc] = useState("");

    useEffect(() => {
        const timeout = setTimeout(() => {
            setSrcDoc(`
                <html>
                    <body>${html}</body>
                    <style>${css}</style>
                    <script>
                        try {
                            ${js}
                        } catch (e) {
                            console.error(e);
                        }
                    </script>
                </html>
            `);
        }, 1000); // 1s debounce

        return () => clearTimeout(timeout);
    }, [html, css, js]);

    // 3. Save Function (Backend PUT)
    const handleSave = async () => {
        if (!projectId) return;
        setSaving(true);
        try {
            const codeString = JSON.stringify({ html, css, js });

            const response = await fetch(`http://localhost:5000/api/project/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeString })
            });

            if (!response.ok) throw new Error("Failed to save");

            setLastSaved(new Date());
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    // 4. Delete Project (Owner Only)
    const handleDeleteProject = async () => {
        if (!projectId || !currentUser) return;
        if (!confirm("⚠️ DELETE PROJECT?\n\nAre you sure you want to delete this project? This action CANNOT be undone.")) return;

        try {
            const res = await fetch(`http://localhost:5000/api/project/${projectId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: currentUser.uid })
            });

            if (res.ok) {
                alert("Project deleted successfully.");
                navigate('/dashboard');
            } else {
                const err = await res.json();
                alert(err.error || "Failed to delete project");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting project");
        }
    };

    // Auto-Save Trigger (Optional - debounces save)
    // For now, let's keep it manual to avoid overwriting issues, 
    // or we can add a simple "Ctrl+S" listener.

    // Keyboard Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [html, css, js]); // Re-bind with current state

    if (loading) return <div style={{ color: 'white', padding: '20px' }}>Loading Editor...</div>;

    const colors = {
        background: '#0D1117',
        sidebarBg: '#161B22',
        border: '#30363D',
        text: '#C9D1D9',
        activeTab: '#1F6FEB',
        inactiveTab: '#21262D'
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: colors.background, color: colors.text }}>

            {/* LEFT SIDEBAR: Project Info */}
            <div style={{ width: '250px', backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.border}`, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: '#58A6FF', cursor: 'pointer', textAlign: 'left' }}
                >
                    ← Dashboard
                </button>
                <h3>{projectData.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#8B949E' }}>Web App (HTML/CSS/JS)</p>

                <div style={{ marginTop: 'auto' }}>
                    {currentUser?.uid === projectData.ownerId && (
                        <button
                            onClick={handleDeleteProject}
                            style={{
                                width: '100%', marginBottom: '15px', padding: '8px',
                                background: 'transparent',
                                border: `1px solid #da3633`, borderRadius: '6px',
                                color: '#da3633', cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            🗑️ Delete Project
                        </button>
                    )}
                    <p style={{ fontSize: '0.8rem', color: '#8B949E' }}>
                        Live Preview Mode.<br />
                        Press <b>Ctrl+S</b> to save.
                    </p>
                    {lastSaved && <p style={{ fontSize: '0.75rem', color: '#238636' }}>Saved: {lastSaved.toLocaleTimeString()}</p>}
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* TOOLBAR & TABS */}
                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.sidebarBg }}>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {['html', 'css', 'js'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setActiveTab(lang as any)}
                                style={{
                                    padding: '5px 15px',
                                    border: 'none',
                                    borderBottom: activeTab === lang ? `2px solid ${colors.activeTab}` : '2px solid transparent',
                                    backgroundColor: 'transparent',
                                    color: activeTab === lang ? 'white' : '#8B949E',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    {/* Live Sync Toggle */}
                    <button
                        onClick={() => setIsLive(!isLive)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '5px 15px', borderRadius: '4px', border: 'none',
                            backgroundColor: isLive ? '#238636' : '#21262D',
                            color: isLive ? 'white' : '#8B949E',
                            cursor: 'pointer', marginRight: '10px'
                        }}
                        title={isLive ? "Syncing with others..." : "Click to enable Real-Time Sync"}
                    >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLive ? '#3fb950' : '#8B949E', boxShadow: isLive ? '0 0 5px #3fb950' : 'none' }}></div>
                        {isLive ? 'Live Sync ON' : 'Live Sync OFF'}
                    </button>

                    {/* Save Indicator */}
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        style={{
                            backgroundColor: '#1F6FEB', color: 'white', border: 'none',
                            padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* EDITOR + PREVIEW SPLIT */}
                <div style={{ flex: 1, display: 'flex' }}>

                    {/* CODE EDITOR (Left) */}
                    <div style={{ flex: 1, borderRight: `1px solid ${colors.border}` }}>
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={activeTab === 'js' ? 'javascript' : activeTab}
                            value={activeTab === 'html' ? html : (activeTab === 'css' ? css : js)}
                            onChange={(value) => {
                                if (activeTab === 'html') setHtml(value || "");
                                else if (activeTab === 'css') setCss(value || "");
                                else setJs(value || "");
                            }}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                automaticLayout: true
                            }}
                        />
                    </div>

                    {/* LIVE PREVIEW (Right) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '5px 10px', backgroundColor: '#010409', borderBottom: `1px solid ${colors.border}`, fontSize: '0.8rem', color: '#8B949E' }}>
                            LIVE PREVIEW
                        </div>
                        <iframe
                            ref={iframeRef}
                            srcDoc={srcDoc}
                            title="Live Preview"
                            style={{ flex: 1, border: 'none', backgroundColor: 'white' }}
                            sandbox="allow-scripts"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WebProjectEditor;
