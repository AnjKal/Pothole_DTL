const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema({
    type: String,
    details: String,
    severity: String,
    location: String,
    image: String,
    comments: [
        {
            text: String,
            date: Date,
        },
    ],
    status: {
        type: String,
        default: "Complaint Received",
    },
    upvotes: {
        type: Number,
        default: 0
    },
    downvotes: {
        type: Number,
        default: 0
    },
    voters: [{
        userId: String,
        voteType: String // 'up' or 'down'
    }]
});

module.exports = mongoose.model("Complaint", ComplaintSchema);
