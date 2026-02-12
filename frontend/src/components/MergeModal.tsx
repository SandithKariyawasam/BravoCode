import React, { useEffect, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';

interface MergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    ownerId: string;
    memberId: string;
    memberName: string;
    language: string;
    onMergeComplete: () => void;
}

const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose, projectId, ownerId, memberId, memberName, language, onMergeComplete }) => {
    const [mainCode, setMainCode] = useState("");
    const [memberCode, setMemberCode] = useState("");
    const [isAlreadyMerged, setIsAlreadyMerged] = useState(false);
    const [loading, setLoading] = useState(false);

    const [mergedCode, setMergedCode] = useState("");
    // const [isEditing, setIsEditing] = useState(false); // Removed Manual Edit based on feedback to keep context visible

    useEffect(() => {
        if (isOpen) {
            fetchCodes();
        }
    }, [isOpen, memberId]);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            // 1. Fetch Main Project Code (Original)
            const mainRes = await fetch(`https://bravocode-backend.vercel.app/api/project/${projectId}`);
            const mainData = await mainRes.json();
            setMainCode(mainData.code || "");

            // 2. Fetch Member Branch Code (Modified)
            const memberRes = await fetch(`https://bravocode-backend.vercel.app/api/project/${projectId}/branch/${memberId}`);
            const memberData = await memberRes.json();
            setMemberCode(memberData.code || "");

            // Check if already merged (backend flag)
            const alreadyMerged = !!memberData.isMerged;
            setIsAlreadyMerged(alreadyMerged);

            if (alreadyMerged) {
                // If merged, default to showing NO CHANGE (Main Code) to prevent accidental double-append
                setMergedCode(mainData.code || "");
            } else {
                // Default: APPEND member code to the end of Main code
                const appendedCode = (mainData.code || "") + "\n\n// --- Merged update from " + memberName + " ---\n\n" + (memberData.code || "");
                setMergedCode(appendedCode);
            }

        } catch (e) {
            console.error(e);
            alert("Failed to load branches");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleMerge = async () => {
        if (!confirm(`Merge changes from ${memberName} into Main Branch? This cannot be undone.`)) return;

        try {
            const res = await fetch(`https://bravocode-backend.vercel.app/api/project/${projectId}/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId, mergedCode, targetMemberId: memberId }) // We send the code from the "Modified" pane
            });

            if (res.ok) {
                alert("Merged successfully!");
                onMergeComplete();
                onClose();
            } else {
                alert("Merge failed");
            }
        } catch (e) {
            console.error(e);
            alert("Error merging");
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', padding: '20px', zIndex: 1000
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'white' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Merge & Update Main Branch</h3>
                    {isAlreadyMerged && <div style={{ color: '#238636', fontSize: '0.8rem', marginTop: '4px' }}>✅ This branch is already merged.</div>}
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: '#8B949E', marginRight: '15px' }}>
                        Start with:
                    </span>
                    <button
                        onClick={() => {
                            if (confirm("Revert to the current Main Branch code? (Ignores member changes)")) {
                                setMergedCode(mainCode);
                            }
                        }}
                        style={{ marginRight: '5px', background: 'transparent', border: '1px solid #30363D', color: '#8B949E', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        title="Start with Current Main code"
                    >
                        Main Code
                    </button>

                    <button
                        onClick={() => {
                            const newCode = mainCode + "\n\n// --- Merged update from " + memberName + " ---\n\n" + memberCode;
                            setMergedCode(newCode);
                        }}
                        style={{ marginRight: '5px', background: 'transparent', border: '1px solid #58A6FF', color: '#58A6FF', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        title="Append Member's code to the end of Main code"
                    >
                        Append to Main
                    </button>

                    <button
                        onClick={() => {
                            if (confirm("Reset to ONLY the Member's proposed code (Overwriting Main)?")) {
                                setMergedCode(memberCode);
                            }
                        }}
                        style={{ marginRight: '15px', background: 'transparent', border: '1px solid #30363D', color: '#8B949E', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        title="Replace Main with Member code"
                    >
                        Replace Main
                    </button>

                    <button onClick={onClose} style={{ marginRight: '10px', background: 'transparent', border: '1px solid #30363D', color: 'white', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleMerge} style={{ backgroundColor: '#238636', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save to Main Branch</button>
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ color: 'white', padding: '20px' }}>Loading Diff...</div>
                ) : (
                    <DiffEditor
                        key={memberCode} // Force re-render if memberCode changes (or on reset if we handled it differently, but state update drives value)
                        height="100%"
                        language={language === 'javascript' || language === 'nodejs' ? 'javascript' : 'python'}
                        original={mainCode}
                        modified={mergedCode} // Controlled value
                        onMount={(editor) => {
                            const modifiedEditor = editor.getModifiedEditor();
                            modifiedEditor.onDidChangeModelContent(() => {
                                setMergedCode(modifiedEditor.getValue());
                            });
                        }}
                        theme="vs-dark"
                        options={{
                            renderSideBySide: true,
                            readOnly: false, // Right side is editable
                            originalEditable: false
                        }}
                    />
                )}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', color: '#8B949E', fontSize: '0.9rem' }}>
                <span>⬅️ <b>Current Main Branch</b> (Reference)</span>
                <span><b>New Main Branch Code</b> (Editable) ➡️ <span style={{ color: '#58A6FF' }}>This code will become Main</span></span>
            </div>
            <p style={{ color: '#8B949E', fontSize: '0.8rem', marginTop: '5px', fontStyle: 'italic', textAlign: 'right' }}>
                * Edits here update the PROJECT, they do not affect the member's personal branch.
            </p>
        </div>
    );
};

export default MergeModal;
