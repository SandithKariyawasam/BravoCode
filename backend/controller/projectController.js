const { db, admin } = require('../firebase');

const createProject = async (req, res) => {
    try {
        const { title, description, language, ownerId, ownerName } = req.body;

        if (!title || !ownerId) {
            return res.status(400).json({ error: "Title and Owner ID are required" });
        }

        const newProject = {
            title,
            description: description || "",
            language: language || "javascript",
            ownerId,
            members: [ownerId],
            membersDetails: [{ uid: ownerId, name: ownerName || "Owner" }],
            code: "// Start coding here...",
            version: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSaved: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('projects').add(newProject);

        res.status(201).json({ id: docRef.id, ...newProject, createdAt: new Date() }); // Send back mock date or fetch it if crucial
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

// ... existing imports ...

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
            // Optional: Save back to DB to avoid future lookups
            // await docRef.update({ membersDetails }); 
            // We'll just return it for now to be safe and fast on read-repair
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

// ... existing imports ...

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

        // Remove from members array
        // Remove from membersDetails array

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

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    requestJoinProject,
    respondToJoinRequest,
    getProjectRequests,
    removeMember
};
