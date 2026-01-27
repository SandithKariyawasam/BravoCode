const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('BravoCode API is running...');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

const { executeCode } = require('./controller/executeCode');
const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    requestJoinProject,
    respondToJoinRequest,
    getProjectRequests,
    removeMember,
    getUserBranch,
    saveUserBranch,
    mergeBranch,
    deleteProject
} = require('./controller/projectController');

const { deleteAccount } = require('./controller/userController');

app.post('/api/run', executeCode);
app.post('/api/projects', createProject);
app.get('/api/projects/:userId', getProjects);
app.get('/api/project/:projectId', getProjectById);
app.put('/api/project/:projectId', updateProject); // This can stay for "updating details" or similar, but code save uses saveUserBranch now
app.delete('/api/project/:projectId', deleteProject);

app.delete('/api/user/:userId', deleteAccount);

// Join Requests
app.post('/api/project/:projectId/join', requestJoinProject);
app.post('/api/project/:projectId/request', respondToJoinRequest);
app.get('/api/project/:projectId/requests', getProjectRequests);
app.post('/api/project/:projectId/remove', removeMember);

// Branching
app.get('/api/project/:projectId/branch/:userId', getUserBranch);
app.post('/api/project/:projectId/branch', saveUserBranch);
app.post('/api/project/:projectId/merge', mergeBranch);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});