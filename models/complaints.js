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
});

module.exports = mongoose.model("Complaint", ComplaintSchema);
