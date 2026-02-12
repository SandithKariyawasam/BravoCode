import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const JoinProject = () => {
    const { projectId } = useParams();
    const { currentUser } = useAuth()!;
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Joining Project...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const join = async () => {
            if (!projectId || !currentUser) return;

            try {
                const res = await fetch(`http://localhost:5000/api/project/${projectId}/join-instant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.uid })
                });

                const data = await res.json();

                if (res.ok) {
                    // Success! Redirect to editor
                    // Small delay to let user see "Success" if they want, but usually instant is better
                    navigate(`/editor/${projectId}`);
                } else {
                    setError(data.error || "Failed to join project");
                    setStatus("Failed");
                }
            } catch (err) {
                console.error(err);
                setError("Network error");
                setStatus("Failed");
            }
        };

        join();
    }, [projectId, currentUser, navigate]);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, color: colors.text }}>
            <h2>{status}</h2>
            {error && <p style={{ color: colors.buttonDanger }}>{error}</p>}

            {status === "Failed" && (
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                    Go to Dashboard
                </button>
            )}
        </div>
    );
};

export default JoinProject;
