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
    const [loading, setLoading] = useState(false);

    // We will use memberCode as the "Result" code base.
    // The Owner can edit the "Modified" side of the DiffEditor? 
    // Monaco DiffEditor modified side IS editable by default!
    // So the owner can fix conflicts directly in the "Your Changes" (Member) pane before submitting.
    const [mergedCode, setMergedCode] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchCodes();
        }
    }, [isOpen, memberId]);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            // 1. Fetch Main Project Code (Original)
            const mainRes = await fetch(`http://localhost:5000/api/project/${projectId}`);
            const mainData = await mainRes.json();
            setMainCode(mainData.code || "");

            // 2. Fetch Member Branch Code (Modified)
            const memberRes = await fetch(`http://localhost:5000/api/project/${projectId}/branch/${memberId}`);
            const memberData = await memberRes.json();
            setMemberCode(memberData.code || "");
            setMergedCode(memberData.code || ""); // Default transparency: We accept their changes unless edited

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
            const res = await fetch(`http://localhost:5000/api/project/${projectId}/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId, mergedCode }) // We send the code from the "Modified" pane
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
                <h3>Merge: {memberName}'s Branch into Main</h3>
                <div>
                    <button onClick={onClose} style={{ marginRight: '10px', background: 'transparent', border: '1px solid #30363D', color: 'white', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleMerge} style={{ backgroundColor: '#238636', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Merge</button>
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ color: 'white', padding: '20px' }}>Loading Diff...</div>
                ) : (
                    <DiffEditor
                        height="100%"
                        language={language === 'javascript' || language === 'nodejs' ? 'javascript' : 'python'}
                        original={mainCode}
                        modified={mergedCode} // Initial value
                        onMount={(editor) => {
                            // Correct way to get value from DiffEditor's modified editor
                            const modifiedEditor = editor.getModifiedEditor();
                            modifiedEditor.onDidChangeModelContent(() => {
                                setMergedCode(modifiedEditor.getValue());
                            });
                        }}
                        theme="vs-dark"
                        options={{
                            renderSideBySide: true,
                            readOnly: false, // Allow owner to edit the RIGHT side (the "To be merged" code)
                            originalEditable: false
                        }}
                    />
                )}
            </div>
            <p style={{ color: '#8B949E', fontSize: '0.9rem', marginTop: '10px' }}>
                Left: Main Branch (Current) | Right: {memberName}'s Branch (Incoming).
                Edit the Right side to resolve conflicts, then click Confirm Merge.
            </p>
        </div>
    );
};

export default MergeModal;
