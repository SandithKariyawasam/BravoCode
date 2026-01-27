import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/images/BravoCode.png'

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
    const { logout, currentUser } = useAuth()!;
    const navigate = useNavigate();

    return (
        <div style={{
            width: '250px',
            height: '100vh',
            backgroundColor: '#161B22',
            borderRight: '1px solid #30363D',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            color: '#C9D1D9'
        }}>
            {/* 1. App Logo / Title */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
                <img src={logo} alt="BravoCode Logo" style={{ width: '240px', height: '100%' }} />
            </div>

            {/* 2. Navigation Menu */}
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', color: '#8B949E', fontWeight: 'bold', marginBottom: '0.5rem' }}>MENU</p>

                <NavButton label="My Projects" active={activeTab === 'my'} onClick={() => setActiveTab('my')} />
                <NavButton label="Shared with Me" active={activeTab === 'shared'} onClick={() => setActiveTab('shared')} />
                <NavButton label="Settings" />
            </div>

            {/* 3. User Profile (Bottom) */}
            <div style={{
                borderTop: '1px solid #30363D',
                paddingTop: '1rem',
                marginTop: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    {/* User Avatar */}
                    <img
                        src={currentUser?.photoURL || "https://via.placeholder.com/30"}
                        alt="User"
                        style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentUser?.displayName}
                        </p>
                    </div>
                </div>

                <button
                    onClick={async () => { await logout(); navigate('/login'); }}
                    style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#21262D',
                        border: '1px solid #30363D',
                        color: '#F85149',
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

const NavButton = ({ label, active = false, onClick }: { label: string, active?: boolean, onClick?: () => void }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%',
            textAlign: 'left',
            padding: '10px',
            backgroundColor: active ? '#1F6FEB' : 'transparent',
            color: active ? '#ffffff' : '#C9D1D9',
            border: 'none',
            borderRadius: '6px',
            marginBottom: '5px',
            cursor: 'pointer',
            fontWeight: active ? 'bold' : 'normal'
        }}>
        {label}
    </button>
);

export default Sidebar;