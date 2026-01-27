const { admin } = require('../firebase');

const deleteAccount = async (req, res) => {
    try {
        const { userId } = req.params;
        const { requesterId } = req.body;

        // Security check: ensure the requester is deleting their OWN account
        if (userId !== requesterId) {
            return res.status(403).json({ error: "Unauthorized to delete this account" });
        }

        // Delete from Firebase Authentication
        await admin.auth().deleteUser(userId);

        // Optional: We could also delete their projects here, 
        // but for now we leave them orphans or handles by manual cleanup to prevent data loss.

        res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ error: "Failed to delete account" });
    }
};

module.exports = {
    deleteAccount
};
