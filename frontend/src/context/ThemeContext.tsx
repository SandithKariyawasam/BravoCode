import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeColors {
    background: string;
    sidebarBg: string;
    cardBg: string;
    text: string;
    textSecondary: string;
    border: string;
    buttonPrimary: string;
    buttonDanger: string;
    buttonSuccess: string;
    hover: string;
    activeTab: string;
    inactiveTab: string;
}

const lightColors: ThemeColors = {
    background: '#ffffff',
    sidebarBg: '#f6f8fa',
    cardBg: '#ffffff',
    text: '#24292f',
    textSecondary: '#57606a',
    border: '#d0d7de',
    buttonPrimary: '#0969da',
    buttonDanger: '#cf222e',
    buttonSuccess: '#1a7f37',
    hover: '#f3f4f6',
    activeTab: '#fd8c73', // Light orange for light mode active
    inactiveTab: '#f6f8fa'
};

const darkColors: ThemeColors = {
    background: '#0D1117',
    sidebarBg: '#161B22',
    cardBg: '#161B22',
    text: '#C9D1D9',
    textSecondary: '#8B949E',
    border: '#30363D',
    buttonPrimary: '#1F6FEB',
    buttonDanger: '#da3633',
    buttonSuccess: '#238636',
    hover: '#21262D',
    activeTab: '#1F6FEB',
    inactiveTab: '#21262D'
};

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const colors = theme === 'dark' ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
