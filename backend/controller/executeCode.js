// server/controllers/executeCode.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const executeCode = (req, res) => {
    const { language, code } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided." });
    }

    // 1. Create a unique filename to prevent conflicts
    const jobId = Date.now();
    const filename = `job_${jobId}.${language === 'python' ? 'py' : 'js'}`;
    const filePath = path.join(__dirname, '../temp', filename);

    // Ensure 'temp' folder exists
    const tempFolder = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder);
    }

    // 2. Write the code to the file
    fs.writeFileSync(filePath, code);

    // 3. Determine the command
    // NOTE: Ensure you have 'python' or 'python3' installed for Python support
    const command = language === 'python'
        ? `python ${filePath}`
        : `node ${filePath}`;

    // 4. Execute the file
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {

        // Cleanup: Delete the file after running
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error("Failed to delete temp file", err);
        }

        // 5. Handle Results
        if (error) {
            // If the code crashed or timed out
            if (error.killed) return res.json({ output: "Error: Script timed out." });
            return res.json({ output: stderr || error.message });
        }

        if (stderr) {
            return res.json({ output: stderr });
        }

        // Success!
        res.json({ output: stdout });
    });
};

module.exports = { executeCode };
