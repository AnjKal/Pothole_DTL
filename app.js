const express = require("express");
const mongoose = require("mongoose");
const prob = require("./models/complaints.js");
const emer = require("./models/EmergencyIssue.js");
const EmergencyIssue = require('./models/EmergencyIssue'); // Import for authority routes
const User = require("./models/User");
const path = require("path");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { stat } = require("fs");
const ForumMessage = require('./models/forum'); // Adjust the path based on your project structure
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');

// Load authority credentials from JSON file
const authData = JSON.parse(fs.readFileSync('auth.json', 'utf8'));

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const Mongo = "mongodb://127.0.0.1:27017/dtl";

// Connect to MongoDB
async function main() {
    await mongoose.connect(Mongo);
    console.log("Connection to DB successful");
}
main().catch((e) => console.error("DB Connection Error:", e));

// Middleware
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

// Session setup
app.use(
    session({
        secret: "secretkey",
        resave: false,
        saveUninitialized: true,
    })
);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Listen for status updates
    socket.on('statusUpdate', (data) => {
        // Broadcast the status update to all clients
        io.emit('statusUpdated', data);
    });
    
    // Listen for new complaints
    socket.on('newComplaint', (data) => {
        io.emit('complaintAdded', data);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated && req.session.userId) {
        return next();
    }
    res.redirect("/login");
}

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage: storage });

// Routes

// Landing Page
app.get("/", (req, res) => {
    res.render("landing");
});

// --- User Authentication Routes ---

// Register Page
app.get("/register", (req, res) => {
    res.render("register");
});

// Register Logic
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {

        const newUser = new User({ username, password });
        await newUser.save();
        console.log("User registered:", username);
        res.redirect("/login");
    } catch (e) {
        console.error("Error during registration:", e);
        res.status(500).send("Error registering user. Please try again.");
        res.redirect("/authority");
    }
});

// Login Page
app.get("/login", (req, res) => {
    // Pass a message parameter if it exists
    const loginMessage = req.session.loginMessage || '';
    // Clear any login message after displaying it once
    req.session.loginMessage = '';
    
    res.render("login", { message: loginMessage });
});

// Login Logic using JSON file for authentication
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    try {
        console.log("Login attempt:", { username });
        
        // Find the authority in the JSON data
        const authority = authData.authorities.find(auth => auth.username === username);
        
        if (authority && authority.password === password) {
            // Set session data
            req.session.userId = username;
            req.session.isAuthenticated = true;
            req.session.isAuthority = true;
            
            console.log("Authority login successful:", username);
            res.redirect("/authority");
        } else {
            // Invalid credentials
            console.log("Authority login failed:", username);
            
            // Set an error message in the session
            req.session.loginMessage = "Invalid username or password";
            res.redirect("/login");
        }
    } catch (e) {
        console.error("Error during login:", e);
        
        req.session.loginMessage = "An error occurred during login";
        res.redirect("/login");
    }
});

// Logout Logic
app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// --- Citizen Routes ---

// Citizen Dashboard
app.get("/citizen", async (req, res) => {
    const problems = await prob.find({});
    res.render("index", { problems });
});

// Add Complaint Page
app.get("/citizen/add", (req, res) => {
    res.render("add");
});

// Add Complaint Logic
app.post("/citizen/add", upload.single("image"), async (req, res) => {
    const { type, details, severity, location } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const status = "Complaint Received";

    try {
        const newComplaint = await prob.create({ type, image: imagePath, details, severity, location, status });
        
        // Emit new complaint event for real-time updates
        io.emit('complaintAdded', {
            id: newComplaint._id,
            type,
            details,
            severity,
            location,
            status,
            image: imagePath
        });
        
        res.redirect("/citizen");
    } catch (error) {
        console.error("Error saving complaint:", error);
        res.status(500).send("Error saving complaint");
    }
});

// Delete Complaint Logic
app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await prob.findByIdAndDelete(id);
        res.redirect("/citizen");
    } catch (error) {
        console.error("Error deleting complaint:", error);
        res.status(500).send("Error deleting complaint");
    }
});
// Emergency Reporting Page
app.get("/citizen/emergency", (req, res) => {
    res.render("emergency"); // Render the emergency reporting page
});

// Emergency Reporting Logic
app.post("/citizen/emergency", async (req, res) => {
    const { type, details, location, otherType } = req.body;
    const finalType = type === 'Other' && otherType ? otherType : type;
    const severity = "Critical"; // Assign a fixed severity for emergency reports
    const status = 'Complaint Received';

    try {
        // Debug log
        console.log("Creating emergency report:", { 
            type: finalType, 
            details, 
            severity, 
            location, 
            status 
        });
        
        const newEmergency = await EmergencyIssue.create({ 
            type: finalType, 
            details, 
            severity, 
            location, 
            status 
        });
        
        console.log("Emergency reported successfully:", newEmergency);
        
        // Redirect to the citizen dashboard
        res.redirect("/citizen");
    } catch (error) {
        console.error("Error saving emergency report:", error);
        res.status(500).send("Error saving emergency report: " + error.message);
    }
});

//Discussion forum
const Discussion = require("./models/forum");

// Fetch discussions
app.get("/forum", async (req, res) => {
    const discussions = await Discussion.find({}).sort({ date: -1 }); // Sort by latest
    res.render("forum", { discussions });
});

// Add a new discussion
app.post("/forum/add", async (req, res) => {
    const { username = "Anonymous", message } = req.body; // Default username if not provided
    await Discussion.create({ username, message });
    res.redirect("/forum");
});

//Clearing the discussion forum
app.post('/forum/clear', async (req, res) => {
    try {
        await ForumMessage.deleteMany({}); // Replace `ForumMessage` with your forum message model
        //res.status(200).send({ message: 'All messages cleared successfully' });
        res.redirect("/forum");
    } catch (error) {
        console.error('Error clearing messages:', error);
        res.status(500).send({ error: 'Failed to clear messages' });
    }
});

// Upvote a complaint
app.post("/complaint/:id/upvote", async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId || 'anonymous' + Math.random().toString(36).substring(7); // Create unique IDs for anonymous users
    
    try {
        console.log(`Processing upvote for complaint ${id} by user ${userId}`);
        const complaint = await prob.findById(id);
        
        if (!complaint) {
            console.error(`Complaint ${id} not found`);
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        // Ensure the voters array exists
        if (!complaint.voters) {
            complaint.voters = [];
        }
        
        // Initialize vote counts if needed
        if (typeof complaint.upvotes !== 'number') complaint.upvotes = 0;
        if (typeof complaint.downvotes !== 'number') complaint.downvotes = 0;
        
        // Always increment upvotes, regardless of previous votes
        complaint.upvotes += 1;
        
        // Track the vote for UI purposes, replacing any existing vote
        const existingVoteIndex = complaint.voters.findIndex(voter => voter.userId === userId);
        if (existingVoteIndex >= 0) {
            complaint.voters[existingVoteIndex].voteType = 'up';
        } else {
            complaint.voters.push({ userId, voteType: 'up' });
        }
        
        console.log(`Saving complaint with upvotes: ${complaint.upvotes}, downvotes: ${complaint.downvotes}`);
        await complaint.save();
        
        // Send back the new counts
        res.json({ 
            upvotes: complaint.upvotes, 
            downvotes: complaint.downvotes,
            success: true,
            message: 'Upvote recorded successfully'
        });
    } catch (error) {
        console.error('Error upvoting complaint:', error);
        res.status(500).json({ 
            error: 'Error upvoting complaint', 
            message: error.message,
            success: false
        });
    }
});

// Downvote a complaint
app.post("/complaint/:id/downvote", async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId || 'anonymous' + Math.random().toString(36).substring(7); // Create unique IDs for anonymous users
    
    try {
        console.log(`Processing downvote for complaint ${id} by user ${userId}`);
        const complaint = await prob.findById(id);
        
        if (!complaint) {
            console.error(`Complaint ${id} not found`);
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        // Ensure the voters array exists
        if (!complaint.voters) {
            complaint.voters = [];
        }
        
        // Initialize vote counts if needed
        if (typeof complaint.upvotes !== 'number') complaint.upvotes = 0;
        if (typeof complaint.downvotes !== 'number') complaint.downvotes = 0;
        
        // Always increment downvotes, regardless of previous votes
        complaint.downvotes += 1;
        
        // Track the vote for UI purposes, replacing any existing vote
        const existingVoteIndex = complaint.voters.findIndex(voter => voter.userId === userId);
        if (existingVoteIndex >= 0) {
            complaint.voters[existingVoteIndex].voteType = 'down';
        } else {
            complaint.voters.push({ userId, voteType: 'down' });
        }
        
        console.log(`Saving complaint with upvotes: ${complaint.upvotes}, downvotes: ${complaint.downvotes}`);
        await complaint.save();
        
        // Send back the new counts
        res.json({ 
            upvotes: complaint.upvotes, 
            downvotes: complaint.downvotes,
            success: true,
            message: 'Downvote recorded successfully'
        });
    } catch (error) {
        console.error('Error downvoting complaint:', error);
        res.status(500).json({ 
            error: 'Error downvoting complaint', 
            message: error.message,
            success: false
        });
    }
});

// Upvote a forum post
app.post("/forum/:id/upvote", async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId || 'anonymous' + Math.random().toString(36).substring(7); // Create unique IDs for anonymous users
    
    try {
        console.log(`Processing upvote for forum post ${id} by user ${userId}`);
        const post = await Discussion.findById(id);
        
        if (!post) {
            console.error(`Forum post ${id} not found`);
            return res.status(404).json({ error: 'Forum post not found' });
        }
        
        // Ensure the voters array exists
        if (!post.voters) {
            post.voters = [];
        }
        
        // Initialize vote counts if needed
        if (typeof post.upvotes !== 'number') post.upvotes = 0;
        if (typeof post.downvotes !== 'number') post.downvotes = 0;
        
        // Always increment upvotes, regardless of previous votes
        post.upvotes += 1;
        
        // Track the vote for UI purposes, replacing any existing vote
        const existingVoteIndex = post.voters.findIndex(voter => voter.userId === userId);
        if (existingVoteIndex >= 0) {
            post.voters[existingVoteIndex].voteType = 'up';
        } else {
            post.voters.push({ userId, voteType: 'up' });
        }
        
        console.log(`Saving forum post with upvotes: ${post.upvotes}, downvotes: ${post.downvotes}`);
        await post.save();
        
        // Send back the new counts
        res.json({ 
            upvotes: post.upvotes, 
            downvotes: post.downvotes,
            success: true,
            message: 'Forum upvote recorded successfully'
        });
    } catch (error) {
        console.error('Error upvoting forum post:', error);
        res.status(500).json({ 
            error: 'Error upvoting forum post', 
            message: error.message,
            success: false
        });
    }
});

// Downvote a forum post
app.post("/forum/:id/downvote", async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId || 'anonymous' + Math.random().toString(36).substring(7); // Create unique IDs for anonymous users
    
    try {
        console.log(`Processing downvote for forum post ${id} by user ${userId}`);
        const post = await Discussion.findById(id);
        
        if (!post) {
            console.error(`Forum post ${id} not found`);
            return res.status(404).json({ error: 'Forum post not found' });
        }
        
        // Ensure the voters array exists
        if (!post.voters) {
            post.voters = [];
        }
        
        // Initialize vote counts if needed
        if (typeof post.upvotes !== 'number') post.upvotes = 0;
        if (typeof post.downvotes !== 'number') post.downvotes = 0;
        
        // Always increment downvotes, regardless of previous votes
        post.downvotes += 1;
        
        // Track the vote for UI purposes, replacing any existing vote
        const existingVoteIndex = post.voters.findIndex(voter => voter.userId === userId);
        if (existingVoteIndex >= 0) {
            post.voters[existingVoteIndex].voteType = 'down';
        } else {
            post.voters.push({ userId, voteType: 'down' });
        }
        
        console.log(`Saving forum post with upvotes: ${post.upvotes}, downvotes: ${post.downvotes}`);
        await post.save();
        
        // Send back the new counts
        res.json({ 
            upvotes: post.upvotes, 
            downvotes: post.downvotes,
            success: true,
            message: 'Forum downvote recorded successfully'
        });
    } catch (error) {
        console.error('Error downvoting forum post:', error);
        res.status(500).json({ 
            error: 'Error downvoting forum post', 
            message: error.message,
            success: false
        });
    }
});

// --- Authority Routes ---
//temp
app.get("/temp", async (req, res) => {
    
    // res.render("authority", { problems });
    res.render("login");
});


// Authority Dashboard
app.get("/authority", async (req, res) => {
    const { type } = req.query; // Get the selected type from the query string
    let problems = [];

    if (type) {
        // Fetch problems matching the selected type
        problems = await prob.find({ type });
    } else {
        // Default view: Show all problems
        problems = await prob.find({});
    }

    res.render("authority", { problems });
    
});

app.post("/authority/status/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const problem = await prob.findById(id);
        if (problem) {
            problem.status = status;
            console.log("Status updated:", status);
            await problem.save();
            
            // Emit status update event for real-time updates
            io.emit('statusUpdated', {
                id,
                status,
                type: problem.type,
                location: problem.location
            });
        }
        res.redirect("/authority");
    } catch (e) {
        console.error("Error updating status:", e);
        res.status(500).send("Unable to update status. Please try again.");
    }
});

// Add Comment to Complaint
app.post("/authority/comment/:id", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    try {
        const problem = await prob.findById(id);
        problem.comments.push({ text: comment, date: new Date() });
        await problem.save();
        res.redirect("/authority");
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).send("Error adding comment");
    }
});

// Route to view emergency issues
app.get('/authority/emergency', async (req, res) => {
    try {
        // Use async/await for the find method
        const emergencyIssues = await EmergencyIssue.find({});
        console.log(`Found ${emergencyIssues.length} emergency issues:`, emergencyIssues);
        
        res.render('viewEmergency', { emergencyIssues });
    } catch (err) {
        console.error("Error fetching emergency issues:", err);
        res.status(500).send('Error fetching emergency issues');
    }
});

app.post("/authority/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await prob.findByIdAndDelete(id);
        res.redirect("/authority");
    } catch (error) {
        console.error("Error deleting complaint:", error);
        res.status(500).send("Error deleting complaint");
    }
}); 

app.post("/authority/emergency/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        // Fix: Use EmergencyIssue model instead of prob model
        await EmergencyIssue.findByIdAndDelete(id);
        console.log(`Emergency issue ${id} deleted successfully`);
        res.redirect("/authority/emergency");
    } catch (error) {
        console.error("Error deleting emergency report:", error);
        res.status(500).send("Error deleting emergency report");
    }
});

// Start the Server
server.listen(8000, () => {
    console.log("Server is running on port 8000");
});
