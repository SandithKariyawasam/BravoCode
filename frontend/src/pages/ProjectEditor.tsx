import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import MergeModal from '../components/MergeModal';

const ProjectEditor = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const { currentUser } = useAuth()!; // Need current user to check ownership
    const { colors, theme } = useTheme();
    const [code, setCode] = useState("// Loading...");
    const [projectData, setProjectData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);

    // Merge State
    const [isMergeOpen, setIsMergeOpen] = useState(false);
    const [mergeTarget, setMergeTarget] = useState<{ id: string, name: string } | null>(null);

    // Direct Main Edit State
    const [isEditingMain, setIsEditingMain] = useState(false);

    // Viewing Member Scope
    const [viewingMember, setViewingMember] = useState<{ id: string, name: string } | null>(null);

    // Merge Status
    const [isMerged, setIsMerged] = useState(false);


    useEffect(() => {
        if (!projectId || !currentUser) return;

        const fetchData = async () => {
            try {
                // 1. Get Project Details
                const res = await fetch(`http://localhost:5000/api/project/${projectId}`);
                if (!res.ok) throw new Error("Project not found");
                const data = await res.json();
                setProjectData(data);

                // 2. Get Code based on mode
                if (isEditingMain) {
                    setCode(data.code || "");
                    setIsMerged(false);
                } else if (viewingMember) {
                    // Viewing another member's branch
                    const branchRes = await fetch(`http://localhost:5000/api/project/${projectId}/branch/${viewingMember.id}`);
                    if (branchRes.ok) {
                        const branchData = await branchRes.json();
                        setCode(branchData.code);
                        setIsMerged(!!branchData.isMerged);
                    } else {
                        setCode("// Unable to load member code");
                    }
                } else {
                    // Get MY Branch Code
                    const branchRes = await fetch(`http://localhost:5000/api/project/${projectId}/branch/${currentUser.uid}`);
                    if (branchRes.ok) {
                        const branchData = await branchRes.json();

                        setCode(branchData.code); // Load MY branch code

                        // Use backend-provided status
                        setIsMerged(!!branchData.isMerged);
                    } else {
                        // Fallback to Main if branch fetch fails (shouldn't happen due to auto-create)
                        setCode(data.code || "");
                    }
                }

            } catch (err) {
                console.error("Failed to load project", err);
                alert("Project not found!");
                navigate('/dashboard');
            }
        };

        fetchData();
        fetchData();
    }, [projectId, navigate, currentUser, isEditingMain, viewingMember]); // Re-fetch when mode changes

    const handleSave = async () => {
        if (!projectId || !currentUser) return;
        setSaving(true);
        try {
            if (isEditingMain) {
                // Update Main Project Directly
                const response = await fetch(`http://localhost:5000/api/project/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                if (!response.ok) throw new Error("Failed to update Main");
                alert("⚠️ DANGER: Main Branch Updated Directly!");
            } else {
                // Save to User Branch
                const response = await fetch(`http://localhost:5000/api/project/${projectId}/branch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.uid, code })
                });
                if (!response.ok) throw new Error("Failed to save");
                alert("Success! Saved to your personal branch.");
                setIsMerged(false); // New changes, so not merged
            }
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

    if (!projectData) return <div style={{ color: 'white', padding: '20px' }}>Loading Project...</div>;

    return (
        <div className="editor-layout" style={{ backgroundColor: colors.background, color: colors.text }}>

            {/* LEFT SIDEBAR: Project Info */}
            <div className="editor-sidebar-panel" style={{ backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.border}` }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: colors.buttonPrimary, cursor: 'pointer', textAlign: 'left' }}
                >
                    ← Back to Dashboard
                </button>

                <h3 style={{ margin: '0 0 10px 0', color: colors.text }}>{projectData.title}</h3>
                <p style={{ fontSize: '0.8rem', color: colors.textSecondary }}>{projectData.language}</p>

                <div style={{ marginTop: '20px', flex: 1, overflowY: 'auto' }}>
                    <h4 style={{ color: colors.text, borderBottom: `1px solid ${colors.border}`, paddingBottom: '5px', marginBottom: '10px' }}>Members</h4>

                    {projectData.membersDetails && projectData.membersDetails.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {projectData.membersDetails.map((member: any) => (
                                <div key={member.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: colors.border, display: 'flex', justifyContent: 'center', alignItems: 'center', color: colors.text, fontSize: '0.7rem' }}>
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span style={{ color: member.uid === projectData.ownerId ? colors.buttonPrimary : colors.text }}>
                                        {member.name || "Unknown"}
                                    </span>

                                    {/* Show merged status for self if viewing list */}
                                    {member.uid === currentUser?.uid && isMerged && <span title="Your branch is merged" style={{ fontSize: '0.8rem' }}>✅</span>}

                                    {/* Merge Button: Owner can merge anyone including self */}
                                    {currentUser && currentUser.uid === projectData.ownerId && (
                                        <button
                                            onClick={() => { setMergeTarget({ id: member.uid, name: member.name }); setIsMergeOpen(true); }}
                                            style={{
                                                marginLeft: '5px', background: 'none', border: 'none',
                                                color: '#2ea043',
                                                cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px',
                                                lineHeight: '1'
                                            }}
                                            title="Merge / Publish"
                                        >
                                            ⛙
                                        </button>
                                    )}

                                    {member.uid === projectData.ownerId && <span>🔵</span>}

                                    {/* Remove Button: Only show if I am owner AND this is not me */}
                                    {currentUser && currentUser.uid === projectData.ownerId && member.uid !== currentUser.uid && (
                                        <button
                                            onClick={() => handleRemoveMember(member.uid)}
                                            style={{
                                                marginLeft: '5px', background: 'none', border: 'none',
                                                color: '#da3633', cursor: 'pointer', fontSize: '1rem', padding: '0 5px'
                                            }}
                                            title="Remove Member"
                                        >
                                            ×
                                        </button>
                                    )}

                                    {/* View Code Button: Show for everyone (except self) */}
                                    {member.uid !== currentUser?.uid && (
                                        <button
                                            onClick={() => {
                                                setIsEditingMain(false); // Disable main view if active
                                                setViewingMember({ id: member.uid, name: member.name });
                                            }}
                                            style={{
                                                marginLeft: 'auto', background: 'none', border: 'none',
                                                color: viewingMember?.id === member.uid ? colors.buttonPrimary : colors.textSecondary, // Highlight if active
                                                cursor: 'pointer', fontSize: '1rem', padding: '0 5px'
                                            }}
                                            title={`View ${member.name}'s Code`}
                                        >
                                            👁️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Fallback for old projects */
                        <p style={{ color: colors.textSecondary, fontSize: '0.8rem' }}>
                            {projectData.members ? `${projectData.members.length} member(s)` : 'No members'}
                        </p>
                    )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                    {/* Delete Project Button (Owner Only) */}
                    {currentUser && projectData.ownerId === currentUser.uid && (
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
                    {/* Direct Edit/View Toggle (Available to All) */}
                    <div style={{ marginBottom: '10px', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer', color: isEditingMain ? (projectData.ownerId === currentUser?.uid ? colors.buttonDanger : colors.buttonPrimary) : colors.textSecondary }}>
                            <input
                                type="checkbox"
                                checked={isEditingMain}
                                onChange={(e) => {
                                    setIsEditingMain(e.target.checked);
                                    if (e.target.checked) setViewingMember(null); // Clear viewing member if main selected
                                }}
                            />
                            {isEditingMain
                                ? (projectData.ownerId === currentUser?.uid ? "⚠️ Editing Main Directly" : "👀 Viewing Main Branch")
                                : (projectData.ownerId === currentUser?.uid ? "Edit Main Branch Manually" : "View Main Branch Code")
                            }
                        </label>
                    </div>

                    <button
                        onClick={() => {
                            if (viewingMember) {
                                setViewingMember(null); // Back to my branch
                            } else {
                                handleSave();
                            }
                        }}
                        disabled={saving || (isEditingMain && projectData.ownerId !== currentUser?.uid)}
                        style={{
                            width: '100%', padding: '10px',
                            backgroundColor: (viewingMember || (isEditingMain && projectData.ownerId !== currentUser?.uid))
                                ? colors.border // Grey for Read Only
                                : (isEditingMain ? colors.buttonDanger : colors.buttonPrimary), // Red for Owner Main, Blue for My Branch
                            color: (viewingMember || (isEditingMain && projectData.ownerId !== currentUser?.uid)) ? colors.textSecondary : 'white',
                            border: 'none', borderRadius: '6px',
                            cursor: (viewingMember || (isEditingMain && projectData.ownerId !== currentUser?.uid)) ? 'pointer' : (saving ? 'wait' : 'pointer'), // Pointer for "Back to my branch"
                            fontWeight: 'bold'
                        }}
                    >
                        {saving ? 'Saving...' : (
                            viewingMember ? '⬅ Back to My Branch' : (
                                isEditingMain
                                    ? (projectData.ownerId === currentUser?.uid ? '⚠️ Update Main Branch' : 'Read Only Mode')
                                    : 'Save Code'
                            )
                        )}
                    </button>
                </div>
            </div>

            {/* CENTER: Monaco Editor */}
            <div className="editor-main-panel">
                {/* Editor Toolbar */}
                <div className="editor-toolbar" style={{ backgroundColor: isEditingMain ? (projectData.ownerId === currentUser?.uid ? '#3e1515' : colors.background) : colors.background, borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ color: isEditingMain ? (projectData.ownerId === currentUser?.uid ? '#ff7b72' : colors.buttonPrimary) : colors.textSecondary, fontSize: '0.9rem', fontStyle: 'italic', fontWeight: isEditingMain ? 'bold' : 'normal' }}>
                        {isEditingMain ? (
                            projectData.ownerId === currentUser?.uid ? "⚠️ You are editing the MAIN BRANCH directly." : "👀 You are viewing the MAIN BRANCH (Read-Only)."
                        ) : (
                            viewingMember ? (
                                <span style={{ color: colors.textSecondary }}>👀 Viewing <span style={{ color: colors.buttonPrimary }}>{viewingMember.name}'s</span> Branch (Read-Only)</span>
                            ) : (
                                <>Branch: <span style={{ color: colors.buttonPrimary }}>{currentUser?.displayName || "Me"}</span></>
                            )
                        )}
                        {!isEditingMain && isMerged && (
                            <span style={{ marginLeft: '10px', backgroundColor: '#238636', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                                ✅ Merged
                            </span>
                        )}
                    </div>

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
                    theme={theme === 'dark' ? "vs-dark" : "light"}
                    language={
                        ['java', 'kotlin', 'r', 'c', 'cpp', 'csharp', 'typescript', 'javascript'].includes(projectData.language)
                            ? projectData.language
                            : 'python'
                    }
                    value={code}
                    onChange={(value) => !viewingMember && setCode(value || "")} // Prevent editing if viewing someone else
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        // ReadOnly if: Viewing Member OR (Viewing Main AND Not Owner)
                        readOnly: !!viewingMember || (isEditingMain && projectData.ownerId !== currentUser?.uid)
                    }}
                />
            </div>

            {/* RIGHT: Terminal (Placeholder) */}
            <div className="editor-terminal-panel" style={{ backgroundColor: '#010409', borderLeft: `1px solid ${colors.border}` }}>
                <p style={{ fontFamily: 'monospace', color: '#8B949E', fontSize: '0.9rem', borderBottom: `1px solid ${colors.border}`, paddingBottom: '5px', margin: 0 }}>
                    TERMINAL / OUTPUT
                </p>
                <div style={{ fontFamily: 'monospace', color: '#C9D1D9', marginTop: '10px', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                    {output || "Ready..."}
                </div>
            </div>

            {/* Merge Modal */}
            {
                mergeTarget && currentUser && (
                    <MergeModal
                        isOpen={isMergeOpen}
                        onClose={() => setIsMergeOpen(false)}
                        projectId={projectId!}
                        ownerId={currentUser.uid}
                        memberId={mergeTarget.id}
                        memberName={mergeTarget.name}
                        language={projectData.language}
                        onMergeComplete={() => {
                            // Reload main code?
                            // Actually, if we merged, our (owner) branch IS updated to main.
                            // So re-fetching local branch is correct.
                            // Let's force a reload of everything
                            window.location.reload();
                        }}
                    />
                )
            }

        </div >
    );
};

export default ProjectEditor;