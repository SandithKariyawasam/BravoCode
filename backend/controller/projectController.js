const { db, admin } = require('../firebase');

const createProject = async (req, res) => {
    try {
        const { title, description, language, ownerId, ownerName } = req.body;

        if (!title || !ownerId) {
            return res.status(400).json({ error: "Title and Owner ID are required" });
        }

        let initialCode = "// Start coding here...";
        if (language === 'java') {
            initialCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}`;
        } else if (language === 'typescript') {
            initialCode = `const greet = (name: string): string => {
    return "Hello " + name + " from TypeScript!";
};

console.log(greet("Developer"));`;
        } else if (language === 'python') {
            initialCode = `print("Hello from Python!")`;
        } else if (language === 'r') {
            initialCode = `print("Hello from R!")`;
        } else if (language === 'c') {
            initialCode = `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}`;
        } else if (language === 'cpp') {
            initialCode = `#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}`;
        } else if (language === 'csharp') {
            initialCode = `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello from C#!");
    }
}`;
        } else if (language === 'kotlin') {
            initialCode = `fun main() {
    println("Hello from Kotlin!")
}`;
        } else if (language === 'go') {
            initialCode = `package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
}`;
        } else if (language === 'rust') {
            initialCode = `fn main() {
    println!("Hello from Rust!");
}`;
        } else if (language === 'scala') {
            initialCode = `object Main {
    def main(args: Array[String]): Unit = {
        println("Hello from Scala!")
    }
}`;
        } else if (language === 'dart') {
            initialCode = `void main() {
  print('Hello from Dart!');
}`;
        } else if (language === 'ruby') {
            initialCode = `puts "Hello from Ruby!"`;
        } else {
            initialCode = `console.log("Hello from Javascript!");`;
        }

        const newProject = {
            title,
            description: description || "",
            language: language || "javascript",
            ownerId,
            members: [ownerId],
            membersDetails: [{ uid: ownerId, name: ownerName || "Owner" }],
            code: initialCode, // Main Branch
            version: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSaved: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('projects').add(newProject);

        // Create Owner Branch
        await docRef.collection('branches').doc(ownerId).set({
            code: initialCode,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ id: docRef.id, ...newProject, createdAt: new Date() });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ error: "Failed to create project" });
    }
};

const getProjects = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const snapshot = await db.collection('projects')
            .where('members', 'array-contains', userId)
            // .orderBy('createdAt', 'desc') // Requires an index in Firestore usually
            .get();

        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert timestamps to dates for frontend if needed, or keeping as is
            createdAt: doc.data().createdAt?.toDate(),
            lastSaved: doc.data().lastSaved?.toDate()
        }));

        res.json(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ error: "Failed to fetch projects" });
    }
};

const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const docRef = db.collection('projects').doc(projectId);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Project not found" });
        }

        const projectData = doc.data();

        // Populate membersDetails if missing
        if (!projectData.membersDetails && projectData.members && projectData.members.length > 0) {
            const membersDetails = [];
            for (const uid of projectData.members) {
                try {
                    const userRecord = await admin.auth().getUser(uid);
                    membersDetails.push({
                        uid,
                        name: userRecord.displayName || "Unknown",
                        photoURL: userRecord.photoURL
                    });
                } catch (e) {
                    console.warn(`Failed to fetch user ${uid}`, e);
                    membersDetails.push({ uid, name: "Unknown User" });
                }
            }
            projectData.membersDetails = membersDetails;
        }

        res.json({ id: doc.id, ...projectData });
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ error: "Failed to fetch project" });
    }
};

const updateProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { code } = req.body;
        // In a real app, verify ownerId matches requester here!

        await db.collection('projects').doc(projectId).update({
            code,
            lastSaved: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ error: "Failed to update project" });
    }
};

const requestJoinProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, displayName } = req.body;

        const docRef = db.collection('projects').doc(projectId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Project not found" });
        }

        const project = doc.data();

        // 1. Check if already a member
        if (project.members && project.members.includes(userId)) {
            return res.json({ status: 'member', message: "You are already a member." });
        }

        // 2. Check for existing request
        // We'll store requests in a subcollection 'joinRequests' to avoid document size limits and cleaner separation
        const requestRef = docRef.collection('joinRequests').doc(userId);
        const requestDoc = await requestRef.get();

        if (requestDoc.exists) {
            return res.json({ status: requestDoc.data().status, message: `Request is ${requestDoc.data().status}` });
        }

        // 3. Create new request
        await requestRef.set({
            userId,
            displayName: displayName || "Unknown User",
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ status: 'pending', message: "Join request sent." });

    } catch (error) {
        console.error("Error asking to join:", error);
        res.status(500).json({ error: "Failed to process join request" });
    }
};

const respondToJoinRequest = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, action, ownerId } = req.body; // action: 'accept' | 'reject'

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) return res.status(404).json({ error: "Project not found" });

        // Verify owner
        if (projectDoc.data().ownerId !== ownerId) {
            return res.status(403).json({ error: "Only the owner can manage requests" });
        }

        const requestRef = projectRef.collection('joinRequests').doc(userId);

        if (action === 'accept') {
            const requestDoc = await requestRef.get();
            const displayName = requestDoc.exists ? requestDoc.data().displayName : "Unknown User";

            // Add to members array AND details
            await projectRef.update({
                members: admin.firestore.FieldValue.arrayUnion(userId),
                membersDetails: admin.firestore.FieldValue.arrayUnion({ uid: userId, name: displayName })
            });
            await requestRef.update({ status: 'accepted' });

            // Initialize Member Branch with CURRENT Main Code
            const currentCode = projectDoc.data().code || "";
            await projectRef.collection('branches').doc(userId).set({
                code: currentCode,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } else {
            await requestRef.update({ status: 'rejected' });
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Error managing request:", error);
        res.status(500).json({ error: "Failed to manage request" });
    }
};

const getProjectRequests = async (req, res) => {
    try {
        const { projectId } = req.params;
        // In real app check ownership here too

        const snapshot = await db.collection('projects').doc(projectId).collection('joinRequests')
            .where('status', '==', 'pending')
            .get();

        const requests = snapshot.docs.map(doc => doc.data());
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch requests" });
    }
}

const removeMember = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { ownerId, memberId } = req.body;

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) return res.status(404).json({ error: "Project not found" });
        if (projectDoc.data().ownerId !== ownerId) {
            return res.status(403).json({ error: "Only the owner can remove members" });
        }

        // Cannot remove self (owner)
        if (ownerId === memberId) {
            return res.status(400).json({ error: "Cannot remove owner" });
        }

        const currentDetails = projectDoc.data().membersDetails || [];
        const newDetails = currentDetails.filter(m => m.uid !== memberId);

        await projectRef.update({
            members: admin.firestore.FieldValue.arrayRemove(memberId),
            membersDetails: newDetails
        });

        // Delete request doc to allow re-joining
        await projectRef.collection('joinRequests').doc(memberId).delete();

        res.json({ success: true });

    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ error: "Failed to remove member" });
    }
}

const getUserBranch = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        const projectRef = db.collection('projects').doc(projectId);
        const branchRef = projectRef.collection('branches').doc(userId);

        const branchDoc = await branchRef.get();

        if (branchDoc.exists) {
            const data = branchDoc.data();
            let isMerged = false;

            if (data.lastMergedAt && data.updatedAt) {
                // Compare Firestore Timestamps directly
                isMerged = data.lastMergedAt.toMillis() >= data.updatedAt.toMillis();
            }

            return res.json({
                code: data.code,
                isMerged,
                updatedAt: data.updatedAt,
                lastMergedAt: data.lastMergedAt
            });
        }

        // If no branch exists, fallback to Main Project code (and create branch)
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) return res.status(404).json({ error: "Project not found" });

        const mainCode = projectDoc.data().code || "";

        // Auto-create branch
        await branchRef.set({
            code: mainCode,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ code: mainCode, isMerged: true }); // Newly created branch matches main effectively

    } catch (e) {
        console.error("Branch fetch error:", e);
        res.status(500).json({ error: "Failed to fetch branch" });
    }
};

const saveUserBranch = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, code } = req.body;

        await db.collection('projects').doc(projectId).collection('branches').doc(userId).set({
            code,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to save branch" });
    }
};

const mergeBranch = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { ownerId, mergedCode, targetMemberId } = req.body; // mergedCode is the resolved code

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (projectDoc.data().ownerId !== ownerId) return res.status(403).json({ error: "Not authorized" });

        // Update Main Branch
        await projectRef.update({
            code: mergedCode,
            lastSaved: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update Owner's branch too to match Main
        // If owner is merging THEMSELVES (targetMemberId === ownerId), we must set lastMergedAt here in the same update
        const ownerUpdateData = {
            code: mergedCode,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (targetMemberId === ownerId) {
            ownerUpdateData.lastMergedAt = admin.firestore.FieldValue.serverTimestamp();
        }

        await projectRef.collection('branches').doc(ownerId).update(ownerUpdateData);

        // If we merged a specific member's branch (and it's NOT the owner, or even if it is, we already handled it above, but let's be safe), mark it as merged
        // Verify we aren't duplicating the update for owner
        if (targetMemberId && targetMemberId !== ownerId) {
            await projectRef.collection('branches').doc(targetMemberId).update({
                lastMergedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.json({ success: true });

    } catch (e) {
        console.error("Merge error:", e);
        res.status(500).json({ error: "Merge failed" });
    }
};

const deleteProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { ownerId } = req.body;

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) return res.status(404).json({ error: "Project not found" });
        if (projectDoc.data().ownerId !== ownerId) {
            return res.status(403).json({ error: "Only the owner can delete the project" });
        }

        await projectRef.delete();
        // Note: Subcollections (branches, requests) remain in Firestore but are orphaned.
        // For a production app, use refined recursive delete.

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ error: "Failed to delete project" });
    }
};

module.exports = {
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
};
