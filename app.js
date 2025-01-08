const express = require("express");
const mongoose = require("mongoose");
const prob = require("./models/complaints.js");
const User = require("./models/User");
const path = require("path");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { stat } = require("fs");

const app = express();
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

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
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
    res.render("login");
});

// Login Logic
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && (await bcrypt.compare(password, user.password))) {
            req.session.userId = user._id;
            res.redirect("/authority");
        } else {
            
            res.redirect("/authority");
        }
    } catch (e) {
        console.error("Error logging in:", e);
        res.status(500).send("Error logging in");
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
        await prob.create({ type, image: imagePath, details, severity, location, status });
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
        }
       res.redirect("/authority"); // Redirect to the authority dashboard??
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

// Delete Complaint Logic
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

// Start the Server
app.listen(8000, () => {
    console.log("Server is running on port 8000");
});
