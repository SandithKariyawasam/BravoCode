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

    if (language === 'kotlin') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'Main.kt';
        const jarName = 'Main.jar';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: kotlinc Main.kt -include-runtime -d Main.jar && java -jar Main.jar
        // We assume kotlinc is in PATH.
        const command = `cd "${jobDir}" && kotlinc ${filename} -include-runtime -d ${jarName} && java -jar ${jarName}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Kotlin job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'kotlinc' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Kotlin Compiler (kotlinc) is not installed.\nPlease install Kotlin CLI compiler." });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'go') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.go';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: go run main.go
        // We assume go is in PATH.
        const command = `cd "${jobDir}" && go run ${filename}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Go job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'go' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Go is not installed.\nPlease install Go from https://go.dev/dl/" });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'rust') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.rs';
        const filePath = path.join(jobDir, filename);
        const outputName = process.platform === 'win32' ? 'main.exe' : 'main';

        fs.writeFileSync(filePath, code);

        // Command: rustc main.rs -o main.exe && main.exe
        // We assume rustc is in PATH.
        // Rust outputs to the current directory by default, so we can just run outputName
        const runCmd = process.platform === 'win32' ? outputName : `./${outputName}`;
        const command = `cd "${jobDir}" && rustc ${filename} -o ${outputName} && ${runCmd}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Rust job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'rustc' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Rust Compiler (rustc) is not installed.\nPlease install Rust from https://rustup.rs/" });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'scala') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'Main.scala';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: scalac Main.scala && scala Main
        // We assume scalac and scala are in PATH.
        // We need to set the classpath to current dir usually, but default might work.
        const command = `cd "${jobDir}" && scalac ${filename} && scala -classpath . Main`;

        exec(command, { timeout: 20000 }, (error, stdout, stderr) => { // Scala cold start can be slow
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Scala job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'scalac' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Scala is not installed.\nPlease install Scala via coursier or your package manager." });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'dart') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.dart';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: dart main.dart
        // We assume dart is in PATH.
        const command = `cd "${jobDir}" && dart ${filename}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Dart job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'dart' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Dart is not installed.\nPlease install Dart SDK." });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'ruby') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.rb';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: ruby main.rb
        const command = `cd "${jobDir}" && ruby ${filename}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Ruby job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'ruby' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Ruby is not installed.\nPlease install Ruby." });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'php') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.php';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: php main.php
        const command = `cd "${jobDir}" && php ${filename}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup PHP job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'php' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: PHP is not installed.\nPlease install PHP." });
                }
                if (error.killed) return res.json({ output: "Error: Script timed out." });
                return res.json({ output: stderr || error.message });
            }
            res.json({ output: stdout || stderr });
        });
        return;
    }

    if (language === 'swift') {
        const jobId = Date.now();
        const tempDir = path.join(__dirname, '../temp');
        const jobDir = path.join(tempDir, `job_${jobId}`);

        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        const filename = 'main.swift';
        const filePath = path.join(jobDir, filename);

        fs.writeFileSync(filePath, code);

        // Command: swift main.swift
        const command = `cd "${jobDir}" && swift ${filename}`;

        exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.rmSync(jobDir, { recursive: true, force: true });
            } catch (err) {
                console.error("Failed to cleanup Swift job", err);
            }

            if (error) {
                const errorStr = (stderr || error.message || "").toString();
                if (errorStr.includes("'swift' is not recognized") || errorStr.includes("command not found")) {
                    return res.json({ output: "System Error: Swift is not installed.\nPlease install Swift." });
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
