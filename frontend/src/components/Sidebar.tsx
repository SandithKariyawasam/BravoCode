import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/images/BravoCode.png'

const Sidebar = ({ activeTab, setActiveTab, onCreateWebProject, webProjects }: { activeTab: string, setActiveTab: (tab: string) => void, onCreateWebProject: () => void, webProjects: any[] }) => {
    const { logout, currentUser } = useAuth()!;
    const { colors } = useTheme();
    const navigate = useNavigate();

    return (
        <div className="sidebar-container" style={{
            height: '100vh',
            backgroundColor: colors.sidebarBg,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            color: colors.text
        }}>
            {/* 1. App Logo / Title */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <img src={logo} alt="BravoCode Logo" className="sidebar-logo" style={{ height: '100%' }} />
            </div>

            {/* 2. Navigation Menu */}
            <div style={{ flex: 1 }}>
                <p className="menu-header" style={{ fontSize: '0.8rem', color: colors.textSecondary, fontWeight: 'bold', marginBottom: '0.5rem' }}>MENU</p>

                <NavButton icon="📂" label="My Projects" active={activeTab === 'my'} onClick={() => setActiveTab('my')} />
                <NavButton icon="👥" label="Shared with Me" active={activeTab === 'shared'} onClick={() => setActiveTab('shared')} />
                <NavButton icon="⚙️" label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />

                <div style={{ height: '1px', backgroundColor: colors.border, margin: '15px 0' }}></div>

                <button
                    onClick={onCreateWebProject}
                    className="sidebar-btn"
                    style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'linear-gradient(90deg, #8957e5 0%, #ae84fa 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.9rem',
                        marginBottom: '10px'
                    }}
                >
                    <span>🌐</span>
                    <span className="sidebar-label">New Web Sandbox</span>
                </button>

                <button
                    onClick={() => navigate('/sql-playground')}
                    className="sidebar-btn"
                    style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'linear-gradient(90deg, #238636 0%, #2ea043 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.9rem',
                        marginBottom: '10px'
                    }}
                >
                    <span>💾</span>
                    <span className="sidebar-label">SQL Playground</span>
                </button>

                {/* Web Projects List */}
                {webProjects && webProjects.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <p className="menu-header" style={{ fontSize: '0.75rem', color: colors.textSecondary, fontWeight: 'bold', marginBottom: '0.5rem', paddingLeft: '5px' }}>WEB SANDBOXES</p>
                        {webProjects.map((project: any) => (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/editor/${project.id}`)}
                                className="sidebar-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    color: colors.text,
                                    fontSize: '0.9rem',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>📄</span>
                                <span className="sidebar-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. User Profile (Bottom) */}
            <div style={{
                borderTop: `1px solid ${colors.border}`,
                paddingTop: '1rem',
                marginTop: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    {/* User Avatar */}
                    <img
                        className="user-avatar"
                        src={currentUser?.photoURL || "https://via.placeholder.com/30"}
                        alt="User"
                        style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                    />
                    <div className="user-info" style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: colors.text }}>
                            {currentUser?.displayName}
                        </p>
                    </div>
                </div>

                <button
                    onClick={async () => { await logout(); navigate('/login'); }}
                    style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: colors.hover,
                        border: `1px solid ${colors.border}`,
                        color: colors.buttonDanger,
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

const NavButton = ({ label, icon, active = false, onClick }: { label: string, icon: string, active?: boolean, onClick?: () => void }) => {
    const { colors } = useTheme();
    return (
        <button
            onClick={onClick}
            className="sidebar-btn"
            style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px',
                backgroundColor: active ? colors.buttonPrimary : 'transparent',
                color: active ? '#ffffff' : colors.text,
                border: 'none',
                borderRadius: '6px',
                marginBottom: '5px',
                cursor: 'pointer',
                fontWeight: active ? 'bold' : 'normal',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
            <span>{icon}</span>
            <span className="sidebar-label">{label}</span>
        </button>
    );
};

export default Sidebar;