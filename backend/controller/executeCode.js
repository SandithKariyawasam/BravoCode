const { spawn } = require('child_process');

// We use the existing backend image which already has all 16 compilers installed!
// This avoids downloading 16 different images during runtime.
const RUNNER_IMAGE = 'ghcr.io/sandithkariyawasam/bravocode-backend:latest';

const LANGUAGE_CONFIG = {
    'python': ['python3', '-'],
    'javascript': ['node', '-'],
    'java': ['sh', '-c', 'cat > Main.java && javac Main.java && java Main'],
    'c': ['sh', '-c', 'cat > main.c && gcc main.c && ./a.out'],
    'cpp': ['sh', '-c', 'cat > main.cpp && g++ main.cpp && ./a.out'],
    'csharp': ['sh', '-c', 'cat > Main.cs && csc /nologo /out:Main.exe Main.cs && mono Main.exe'], // Wait, ubuntu has dotnet sdk installed in Dockerfile
    'go': ['sh', '-c', 'cat > main.go && go run main.go'],
    'rust': ['sh', '-c', 'cat > main.rs && rustc main.rs && ./main'],
    'php': ['php', '--'],
    'ruby': ['ruby', '-'],
    'r': ['sh', '-c', 'cat > main.r && Rscript main.r'],
    'scala': ['sh', '-c', 'cat > Main.scala && scalac Main.scala && scala Main'],
    'dart': ['sh', '-c', 'cat > main.dart && dart main.dart'],
    'swift': ['sh', '-c', 'cat > main.swift && swift main.swift'],
    'typescript': ['sh', '-c', 'cat > main.ts && ts-node main.ts'],
    'kotlin': ['sh', '-c', 'cat > Main.kt && kotlinc Main.kt -include-runtime -d Main.jar && java -jar Main.jar']
};

// Fix C# command since we installed dotnet-sdk-8.0, not mono
LANGUAGE_CONFIG['csharp'] = ['sh', '-c', 'cat > Program.cs && dotnet new console -n temp >/dev/null 2>&1 && mv Program.cs temp/ && cd temp && dotnet run'];

const executeCode = (req, res) => {
    const { language, code } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided." });
    }

    const config = LANGUAGE_CONFIG[language];
    
    if (!config) {
        return res.status(400).json({ output: `Error: Language '${language}' is not supported.` });
    }

    // Spawn a completely isolated, ephemeral Docker container
    // --rm: Remove container after execution
    // -i: Keep STDIN open even if not attached
    // --network none: Disable network access (Extreme security flex!)
    // --memory="256m" --cpus="0.5": Resource limits
    const dockerArgs = [
        'run',
        '--rm',
        '-i',
        '--network', 'none',
        '--memory=256m',
        '--cpus=0.5',
        '--entrypoint', config[0],
        RUNNER_IMAGE,
        ...config.slice(1)
    ];

    const child = spawn('docker', dockerArgs);

    let output = '';
    let errorOutput = '';

    // Write the user's code directly into the container's standard input
    child.stdin.write(code);
    child.stdin.end();

    child.stdout.on('data', (data) => {
        output += data.toString();
    });

    child.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    // Kill the container if it runs longer than 10 seconds
    const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        errorOutput += "\nError: Execution timed out (Limit: 10s).";
    }, 10000);

    child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0 && !output) {
            // Check for common Docker errors
            if (errorOutput.includes("Cannot connect to the Docker daemon")) {
                return res.json({ output: "System Error: Docker daemon is not accessible. Ensure /var/run/docker.sock is mounted." });
            }
            if (errorOutput.includes("manifest for ghcr.io")) {
                return res.json({ output: "System Error: Runner image not found. Ensure backend image is built and tagged." });
            }
            return res.json({ output: errorOutput });
        }

        // Return combined output (standard output + standard error)
        res.json({ output: output || errorOutput });
    });
};

module.exports = { executeCode };
