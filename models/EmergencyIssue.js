const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for EmergencyIssue
const emergencyIssueSchema = new Schema({
    type: { 
        type: String, 
        required: true,
        enum: ['Fire', 'Flood', 'Accident', 'Medical', 'Other'], // Define possible types
    },
    details: { 
        type: String, 
        required: true 
    },
    severity: { 
        type: String, 
        required: true, 
        enum: ['Low', 'Medium', 'High', 'Critical'] // Define severity levels
    },
    location: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        required: true, 
        enum: ['Complaint Received', 'Responded by Authority', 'Work Under Progress', 'Work Done'], 
        default: 'Complaint Received'
    },
    comments: [
        {
            text: { 
                type: String, 
                required: true 
            },
            date: { 
                type: Date, 
                default: Date.now 
            },
        }
    ],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Create a model using the schema
const EmergencyIssue = mongoose.model('EmergencyIssue', emergencyIssueSchema);

module.exports = EmergencyIssue;
