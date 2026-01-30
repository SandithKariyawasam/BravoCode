import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
// @ts-ignore
import initSqlJs from 'sql.js';

const SQLPlayground = () => {
    const navigate = useNavigate();
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

    const colors = {
        background: '#0D1117',
        sidebarBg: '#161B22',
        border: '#30363D',
        text: '#C9D1D9',
        button: '#238636'
    };

    if (loading) return <div style={{ color: 'white', padding: '20px' }}>Loading SQL Engine...</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: colors.background, color: colors.text }}>

            {/* SIDEBAR: Schema View */}
            <div style={{ width: '280px', backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.border}`, padding: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{ marginBottom: '20px', background: 'transparent', border: 'none', color: '#58A6FF', cursor: 'pointer', textAlign: 'left' }}
                >
                    ← Dashboard
                </button>

                <h3 style={{ marginBottom: '10px' }}>Available Tables</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {schema.map(table => (
                        <div key={table.name}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
                                <span>📄</span> {table.name}
                            </div>
                            <div style={{ paddingLeft: '20px', borderLeft: `1px solid ${colors.border}` }}>
                                {table.columns.map((col: any) => (
                                    <div key={col.name} style={{ fontSize: '0.85rem', color: '#8B949E', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{col.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#58A6FF' }}>{col.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {schema.length === 0 && <p style={{ fontSize: '0.8rem', color: '#8B949E' }}>No tables found.</p>}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#8B949E' }}>
                        * Database resets on refresh.
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* TOOLBAR */}
                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.sidebarBg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>Input</span>
                    </div>
                    <button
                        onClick={handleRun}
                        style={{
                            backgroundColor: colors.button, color: 'white', border: 'none',
                            padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        ▶ Run SQL
                    </button>
                </div>

                {/* SPLIT VIEW */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* EDITOR */}
                    <div style={{ flex: 1, minHeight: '40%', borderBottom: `1px solid ${colors.border}` }}>
                        <Editor
                            height="100%"
                            theme="vs-dark"
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
                    <div style={{ flex: 1, padding: '20px', overflow: 'auto', backgroundColor: '#010409' }}>
                        <h4 style={{ marginTop: 0, color: '#8B949E', textTransform: 'uppercase', fontSize: '0.8rem' }}>Output</h4>

                        {error && (
                            <div style={{ padding: '10px', backgroundColor: 'rgba(218, 54, 51, 0.2)', color: '#ff7b72', border: '1px solid #da3633', borderRadius: '6px' }}>
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {result.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {result.map((res, idx) => (
                                    <div key={idx} style={{ overflowX: 'auto' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#8B949E', marginBottom: '5px' }}>Result Set {idx + 1}</p>
                                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: colors.sidebarBg }}>
                                                    {res.columns.map((col: string, cIdx: number) => (
                                                        <th key={cIdx} style={{ padding: '8px', border: `1px solid ${colors.border}`, textAlign: 'left' }}>{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {res.values.map((row: any[], rIdx: number) => (
                                                    <tr key={rIdx}>
                                                        {row.map((val: any, vIdx: number) => (
                                                            <td key={vIdx} style={{ padding: '8px', border: `1px solid ${colors.border}` }}>{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !error && <p style={{ color: '#8B949E', fontStyle: 'italic' }}>Run query to see results...</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SQLPlayground;
