// server/controllers/executeCode.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const executeCode = (req, res) => {
    const { language, code } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided." });
    }

    const jobId = Date.now();
    const tempDir = path.join(__dirname, '../temp');

    // Ensure temp root exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Java specific logic
    if (language === 'java') {
        // Java requires class name 'Main' to match file 'Main.java'
        // We create a unique subfolder to avoid class conflicts
        const jobDir = path.join(tempDir, `job_${jobId}`);
        fs.mkdirSync(jobDir);

        const filePath = path.join(jobDir, 'Main.java');

        // Write the code
        fs.writeFileSync(filePath, code);

        // Compile and Run
        // 1. javac Main.java
        // 2. java -cp . Main
        const command = `javac "${filePath}" && java -cp "${jobDir}" Main`;

        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            // Cleanup: Recursive delete of job directory
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Java job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'javac' is not recognized") || errorStr.includes("'java' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Java JDK is not installed or not in PATH.\nPlease install JDK." });
                }

                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });

        return;
    }

    if (language === 'r') {
        const jobId = Date.now();
        const filename = `job_${jobId}.r`;
        const filePath = path.join(tempDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: Rscript filename
        const command = `Rscript "${filePath}"`;

        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error("Failed to delete temp file", err);
            }

            if (error) {
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'c' || language === 'cpp') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const extension = language === 'cpp' ? 'cpp' : 'c';
        const filename = `main.${extension}`;
        const filePath = path.join(jobDir, filename);

        // Output file
        const outputName = process.platform === 'win32' ? 'main.exe' : 'main';

        fs.writeFileSync(filePath, code);

        // Command: gcc/g++ filename -o output && output
        const compiler = language === 'cpp' ? 'g++' : 'gcc';
        const runCmd = process.platform === 'win32' ? outputName : `./${outputName}`;
        const command = `cd "${jobDir}" && ${compiler} ${filename} -o ${outputName} && ${runCmd}`;

        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error(`Failed to cleanup ${language} job`, err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'gcc' is not recognized") || errorStr.includes("'g++' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: `System Error: ${compiler} is not installed or not in PATH.\nPlease install MinGW (Windows) or GCC (Linux).` });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'csharp') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'Main.cs';
        const filePath = path.join(jobDir, filename);
        // Output file
        const outputName = 'Main.exe';

        fs.writeFileSync(filePath, code);

        // Command: csc /out:Main.exe Main.cs && Main.exe
        // We use full path for safety, but relative works if cwd is correct.
        // Assuming 'csc' is in PATH.
        const command = `cd "${jobDir}" && csc /nologo /out:${outputName} ${filename} && ${outputName}`;

        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup C# job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'csc' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: C# Compiler (csc) is not installed or not in PATH.\nPlease install .NET Framework or Visual Studio Build Tools." });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'typescript') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.ts';
        const jsFilename = 'main.js';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: tsc main.ts && node main.js
        // We assume tsc is in PATH (e.g., globally installed or local node_modules/.bin)
        // If local, we might need `npx tsc` but that's slower. Let's try direct tsc first.
        const command = `cd "${jobDir}" && tsc ${filename} && node ${jsFilename}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup TS job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'tsc' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: TypeScript Compiler (tsc) is not installed.\nPlease install it globally via: npm install -g typescript" });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    // Default logic for Python/JS (Single file)
    const extension = language === 'python' ? 'py' : 'js';
    const filename = `job_${jobId}.${extension}`;
    const filePath = path.join(tempDir, filename);

    fs.writeFileSync(filePath, code);

    const command = language === 'python'
        ? `python "${filePath}"`
        : `node "${filePath}"`;

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error("Failed to delete temp file", err);
        }

        if (error) {
            // Check for common "Command not found" codes/messages
            const errorStr = (stderr || error.message || "").toString();
            if (errorStr.includes("'Rscript' is not recognized") || errorStr.includes("command not found")) {
                return res.json({ output: "System Error: R is not installed or 'Rscript' is not in the system PATH.\nPlease install R from https://cran.r-project.org/" });
            }
            if (errorStr.includes("'javac' is not recognized") || errorStr.includes("'java' is not recognized")) {
                return res.json({ output: "System Error: Java JDK is not installed or 'javac' is not in the system PATH.\nPlease install JDK from https://www.oracle.com/java/technologies/downloads/" });
            }

            if (error.killed) return res.json({ output: "Error: Script timed out." });
            return res.json({ output: stderr || error.message });
        }
        res.json({ output: stdout || stderr });
    });
};

module.exports = { executeCode };
