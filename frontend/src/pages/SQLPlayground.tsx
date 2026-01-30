import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
// @ts-ignore
import initSqlJs from 'sql.js';
import { useTheme } from '../context/ThemeContext';

const SQLPlayground = () => {
    const navigate = useNavigate();
    const { colors, theme } = useTheme();
    const [db, setDb] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any[]>([]);
    const [schema, setSchema] = useState<any[]>([]); // { name: string, columns: {name, type}[] }
    const [code, setCode] = useState<string>(`-- Available Tables: Customers, Orders

SELECT * FROM Customers;

-- Try joining them:
-- SELECT Customers.first_name, Orders.item, Orders.amount
-- FROM Customers
-- JOIN Orders ON Customers.customer_id = Orders.customer_id;`);

    const [loading, setLoading] = useState(true);

    // Initialize DB & Seed Data
    useEffect(() => {
        const loadSQL = async () => {
            try {
                const SQL = await initSqlJs({
                    locateFile: (file: string) => `/${file}`
                });
                const database = new SQL.Database();
                setDb(database);

                // Seed Data (2 Tables, 5 Rows each)
                database.run(`
                    CREATE TABLE Customers (
                        customer_id INT, 
                        first_name TEXT, 
                        last_name TEXT, 
                        age INT, 
                        country TEXT
                    );
                    
                    INSERT INTO Customers VALUES 
                    (1, 'John', 'Doe', 31, 'USA'),
                    (2, 'Robert', 'Luna', 22, 'USA'),
                    (3, 'David', 'Robinson', 22, 'UK'),
                    (4, 'John', 'Reinhardt', 25, 'UK'),
                    (5, 'Betty', 'Doe', 28, 'UAE');

                    CREATE TABLE Orders (
                        order_id INT, 
                        item TEXT, 
                        amount INT, 
                        customer_id INT
                    );
                    
                    INSERT INTO Orders VALUES 
                    (1, 'Keyboard', 400, 4),
                    (2, 'Mouse', 300, 4),
                    (3, 'Monitor', 12000, 3),
                    (4, 'Keyboard', 400, 1),
                    (5, 'Mousepad', 250, 2);
                `);

                fetchSchema(database);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load sql.js", err);
                setError("Failed to initialize database engine.");
                setLoading(false);
            }
        };
        loadSQL();
    }, []);

    const fetchSchema = (database: any) => {
        try {
            // Get list of tables
            const tablesRes = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            const tables = tablesRes[0]?.values.flat() || [];

            const newSchema = [];
            for (const table of tables) {
                const colsRes = database.exec(`PRAGMA table_info(${table})`);
                const columns = colsRes[0]?.values.map((col: any) => ({
                    name: col[1], // name
                    type: col[2]  // type
                }));
                newSchema.push({ name: table, columns });
            }
            setSchema(newSchema);
        } catch (e) {
            console.error("Error fetching schema", e);
        }
    };

    const handleRun = () => {
        if (!db) return;
        setError(null);
        setResult([]);

        try {
            const res = db.exec(code);
            setResult(res);
            // Refresh schema in case they created/dropped tables
            fetchSchema(db);
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <div style={{ color: colors.text, padding: '20px', backgroundColor: colors.background, height: '100vh' }}>Loading SQL Engine...</div>;

    return (
        <div className="editor-layout" style={{ backgroundColor: colors.background, color: colors.text }}>

            {/* SIDEBAR: Schema View */}
            <div className="editor-sidebar-panel" style={{ backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.border}`, overflowY: 'auto' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: colors.buttonPrimary, cursor: 'pointer', textAlign: 'left' }}
                >
                    ← Dashboard
                </button>

                <h3 style={{ marginBottom: '10px' }}>Available Tables</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {schema.map(table => (
                        <div key={table.name}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', color: colors.text, marginBottom: '5px' }}>
                                <span>📄</span> {table.name}
                            </div>
                            <div style={{ paddingLeft: '20px', borderLeft: `1px solid ${colors.border}` }}>
                                {table.columns.map((col: any) => (
                                    <div key={col.name} style={{ fontSize: '0.85rem', color: colors.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{col.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: colors.buttonPrimary }}>{col.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {schema.length === 0 && <p style={{ fontSize: '0.8rem', color: colors.textSecondary }}>No tables found.</p>}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                    <p style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        * Database resets on refresh.
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="editor-main-panel">

                {/* TOOLBAR */}
                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.sidebarBg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>Input</span>
                    </div>
                    <button
                        onClick={handleRun}
                        style={{
                            backgroundColor: colors.buttonPrimary, color: 'white', border: 'none',
                            padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        ▶ Run SQL
                    </button>
                </div>

                {/* SPLIT VIEW */}
                <div className="split-view">

                    {/* EDITOR */}
                    <div className="split-panel" style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <Editor
                            height="100%"
                            theme={theme === 'dark' ? "vs-dark" : "light"}
                            defaultLanguage="sql"
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                automaticLayout: true,
                                scrollBeyondLastLine: false
                            }}
                        />
                    </div>

                    {/* RESULTS / ERROR */}
                    <div className="split-panel" style={{ padding: '20px', overflow: 'auto', backgroundColor: colors.background }}>
                        <h4 style={{ marginTop: 0, color: colors.textSecondary, textTransform: 'uppercase', fontSize: '0.8rem' }}>Output</h4>

                        {error && (
                            <div style={{ padding: '10px', backgroundColor: 'rgba(218, 54, 51, 0.2)', color: colors.buttonDanger, border: `1px solid ${colors.buttonDanger}`, borderRadius: '6px' }}>
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {result.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {result.map((res, idx) => (
                                    <div key={idx} style={{ overflowX: 'auto' }}>
                                        <p style={{ fontSize: '0.8rem', color: colors.textSecondary, marginBottom: '5px' }}>Result Set {idx + 1}</p>
                                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: colors.sidebarBg }}>
                                                    {res.columns.map((col: string, cIdx: number) => (
                                                        <th key={cIdx} style={{ padding: '8px', border: `1px solid ${colors.border}`, textAlign: 'left', color: colors.text }}>{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {res.values.map((row: any[], rIdx: number) => (
                                                    <tr key={rIdx}>
                                                        {row.map((val: any, vIdx: number) => (
                                                            <td key={vIdx} style={{ padding: '8px', border: `1px solid ${colors.border}`, color: colors.text }}>{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !error && <p style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Run query to see results...</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SQLPlayground;
