# BravoCode - Collaborative Cloud IDE

BravoCode is a powerful, real-time collaborative code editor that runs in your browser. It supports over 15 programming languages, offers a dedicated Web Sandbox for frontend development, and includes an offline SQL Playground for database learning.

## 🚀 Key Features

### 🖥️ Multi-Language Support
Write, compile, and run code in **15+ languages** directly from the browser:
-   **Systems**: C, C++, Rust, Go, Swift
-   **Web/Scripting**: JavaScript (Node.js), TypeScript, Python, Ruby, PHP
-   **JVM**: Java, Kotlin, Scala
-   **Data/Other**: R, Dart, C#

### 🌐 Web Project Sandbox
A specialized environment for HTML/CSS/JS development:
-   **Live Preview**: See your changes update instantly as you type.
-   **Tabbed Interface**: Switch easily between `index.html`, `style.css`, and `script.js`.
-   **Split View**: Editor on the left, live result on the right.

### 🗄️ SQL Playground
A built-in, client-side SQL learning environment:
-   **No Backend Required**: Powered by `sql.js` (SQLite in WebAssembly).
-   **Instant Feedback**: Execute queries and visualize results in dynamic tables.
-   **Auto-Seeding**: Comes with pre-loaded `Customers` and `Orders` tables for immediate practice.

### 🤝 Seamless Collaboration
-   **Instant Join**: Share a unique link (e.g., `/join/project-id`) to let anyone join your project instantly without approval.
-   **Branching Workflow**:
    -   **Owner Control**: Owners manage the "Main" branch.
    -   **Member Branches**: Every member gets their own branch to work safely.
    -   **Merging**: Owners can review member code via diffs and merge changes into Main.

## 🛠️ Tech Stack
-   **Frontend**: React (Vite), Monaco Editor (VS Code core), React Router.
-   **Backend**: Node.js, Express.
-   **Database**: Firebase Firestore (Real-time data), Firebase Auth.
-   **Execution**: Server-side compilation using standard compilers (`gcc`, `javac`, etc.) and `child_process`.

## 📦 Installation & Setup

### Prerequisites
1.  **Node.js** (v14+)
2.  **Compilers**: Ensure you have the necessary compilers installed on your server machine for the languages you want to support (e.g., `gcc`, `java`, `python`, `go`).

### 1. Backend Setup
```bash
cd backend
npm install
# Configure your firebase.js with your credentials
node server.js
```
*Runs on port 5000 by default.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Runs on http://localhost:5173*

## 📖 Usage Guide

### Creating a Project
1.  Click **"New Project"** on the dashboard.
2.  Select your language (e.g., Python, C++, Web App).
3.  Click Create.

### Inviting Members
1.  Open your project.
2.  Click the blue **"🔗 Share Invite Link"** button in the sidebar.
3.  Send the link to your team. They will be added instantly upon clicking!

### Merging Code (Owner Only)
1.  When a member has made changes, click the **Merge Icon (⛙)** next to their name in the sidebar.
2.  Review the differences between their code and the Main branch.
3.  Click **"Merge & Publish"** to update the Main branch.

## 🛡️ License
This project is open source. Happy Coding!
