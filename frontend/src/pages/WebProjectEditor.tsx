import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface WebProjectData {
    title: string;
    ownerId: string;
    lastSaved?: { _seconds?: number } | number;
    code?: string;
}

const WebProjectEditor = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth()!;
    const { colors, theme } = useTheme();

    const [projectData, setProjectData] = useState<WebProjectData | null>(null);
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

    const fetchProject = useCallback(async (background = false) => {
        if (!projectId || !currentUser) return;
        try {
            const res = await fetch(`https://bravocode-backend.vercel.app/api/project/${projectId}`);
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
    }, [projectId, currentUser, serverLastSaved, html, css, js, navigate]);

    // Initial Load
    useEffect(() => {
        fetchProject(false);
    }, [fetchProject]);

    // Polling Loop
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            fetchProject(true);
        }, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
    }, [isLive, fetchProject]);


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
    const handleSave = useCallback(async () => {
        if (!projectId) return;
        setSaving(true);
        try {
            const codeString = JSON.stringify({ html, css, js });

            const response = await fetch(`https://bravocode-backend.vercel.app/api/project/${projectId}`, {
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
    }, [projectId, html, css, js]);

    // 4. Delete Project (Owner Only)
    const handleDeleteProject = async () => {
        if (!projectId || !currentUser) return;
        if (!confirm("⚠️ DELETE PROJECT?\n\nAre you sure you want to delete this project? This action CANNOT be undone.")) return;

        try {
            const res = await fetch(`https://bravocode-backend.vercel.app/api/project/${projectId}`, {
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
    }, [handleSave]); // Re-bind with current state

    if (loading) return <div style={{ color: colors.text, padding: '20px', backgroundColor: colors.background, height: '100vh' }}>Loading Editor...</div>;

    // 5. Share Functionality
    const handleShare = () => {
        const url = `${window.location.origin}/join/${projectId}`;
        navigator.clipboard.writeText(url).then(() => {
            alert(`Invite Link Copied!\n\n${url}\n\nShare this link to let others join instantly.`);
        });
    };

    const tabStyle: React.CSSProperties = {
        width: '100%',
        padding: '8px 10px',
        textAlign: 'left',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    };

    return (
        <div className="editor-layout" style={{ backgroundColor: colors.background, color: colors.text }}>

            {/* LEFT SIDEBAR - FILES & MEMBERS */}
            <div className="editor-sidebar-panel" style={{ backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.border}` }}>
                <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: colors.buttonPrimary, cursor: 'pointer', textAlign: 'left' }}>← Dashboard</button>

                <h3>{projectData ? projectData.title : 'Loading...'}</h3>

                {/* Available Files (Tabs) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
                    <button style={{ ...tabStyle, backgroundColor: activeTab === 'html' ? colors.border : 'transparent', color: '#E34C26' }} onClick={() => setActiveTab('html')}>index.html</button>
                    <button style={{ ...tabStyle, backgroundColor: activeTab === 'css' ? colors.border : 'transparent', color: '#563D7C' }} onClick={() => setActiveTab('css')}>style.css</button>
                    <button style={{ ...tabStyle, backgroundColor: activeTab === 'js' ? colors.border : 'transparent', color: '#F1E05A' }} onClick={() => setActiveTab('js')}>script.js</button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={handleShare}
                        style={{
                            width: '100%', padding: '8px',
                            backgroundColor: colors.buttonPrimary, color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                    >
                        🔗 Share Invite Link
                    </button>
                </div>
                <div style={{ marginTop: 'auto' }}>
                    {currentUser?.uid === projectData?.ownerId && (
                        <button
                            onClick={handleDeleteProject}
                            style={{
                                width: '100%', marginBottom: '15px', padding: '8px',
                                background: 'transparent',
                                border: `1px solid ${colors.buttonDanger}`, borderRadius: '6px',
                                color: colors.buttonDanger, cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            🗑️ Delete Project
                        </button>
                    )}
                    <p style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                        Live Preview Mode.<br />
                        Press <b>Ctrl+S</b> to save.
                    </p>
                    {lastSaved && <p style={{ fontSize: '0.75rem', color: '#238636' }}>Saved: {lastSaved.toLocaleTimeString()}</p>}
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="editor-main-panel">

                {/* TOOLBAR & TABS */}
                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.sidebarBg }}>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {['html', 'css', 'js'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setActiveTab(lang as 'html' | 'css' | 'js')}
                                style={{
                                    padding: '5px 15px',
                                    border: 'none',
                                    borderBottom: activeTab === lang ? `2px solid ${colors.activeTab}` : '2px solid transparent',
                                    backgroundColor: 'transparent',
                                    color: activeTab === lang ? colors.text : colors.textSecondary,
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
                            backgroundColor: isLive ? '#238636' : colors.inactiveTab,
                            color: isLive ? 'white' : colors.textSecondary,
                            cursor: 'pointer', marginRight: '10px'
                        }}
                        title={isLive ? "Syncing with others..." : "Click to enable Real-Time Sync"}
                    >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLive ? '#3fb950' : colors.textSecondary, boxShadow: isLive ? '0 0 5px #3fb950' : 'none' }}></div>
                        {isLive ? 'Live Sync ON' : 'Live Sync OFF'}
                    </button>

                    {/* Save Indicator */}
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        style={{
                            backgroundColor: colors.buttonPrimary, color: 'white', border: 'none',
                            padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* EDITOR + PREVIEW SPLIT */}
                <div className="split-view">

                    {/* CODE EDITOR (Left) */}
                    <div className="split-panel" style={{ borderRight: `1px solid ${colors.border}` }}>
                        <Editor
                            height="100%"
                            theme={theme === 'dark' ? "vs-dark" : "light"}
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
                    <div className="split-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '5px 10px', backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}`, fontSize: '0.8rem', color: colors.textSecondary }}>
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
