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

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); 
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); 
    },
});

const upload = multer({ storage });

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "uploads"))); 
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

<<<<<<< HEAD
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
=======
>>>>>>> ca235dc7d5477f4867ee0b99f162348ddf788928
app.get("/citizen", async (req, res) => {
    const problems = await prob.find({});

    function getStatusWidth(status) {
        switch (status) {
            case "Complaint Received":
                return "25%";
            case "Responded by Authority":
                return "50%";
            case "Work Under Progress":
                return "75%";
            case "Work Done":
                return "100%";
            default:
                return "0%";
        }
    }

    res.render("index", { problems, getStatusWidth });
});

// Add Complaint Page
app.get("/citizen/add", (req, res) => {
    res.render("add");
});

<<<<<<< HEAD
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
=======
app.post("/citizen/add", upload.single("image"), async (req, res) => {
    const { type, details, severity, location } = req.body;
    const imagePath = req.file ? req.file.filename : ""; 

    await prob.create({ type, image: imagePath, details, severity, location });
    res.redirect("/citizen");
>>>>>>> ca235dc7d5477f4867ee0b99f162348ddf788928
});

// Delete Complaint Logic
app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
<<<<<<< HEAD
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
=======
    await prob.findByIdAndDelete(id);
    res.redirect("/authority");
});

>>>>>>> ca235dc7d5477f4867ee0b99f162348ddf788928
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
<<<<<<< HEAD
            console.log("Status updated:", status);
=======
>>>>>>> ca235dc7d5477f4867ee0b99f162348ddf788928
            await problem.save();
        }
        res.redirect("/authority");
    } catch (e) {
        console.error("Error updating status:", e);
        res.status(500).send("Unable to update status. Please try again.");
    }
});

<<<<<<< HEAD
// Add Comment to Complaint
=======
>>>>>>> ca235dc7d5477f4867ee0b99f162348ddf788928
app.post("/authority/comment/:id", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    try {
        const problem = await prob.findById(id);
<<<<<<< HEAD
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
=======
        
        problem.comments.push({ text: comment, date: new Date() });
        
        if (problem.status === "Complaint Received") {
            problem.status = "Responded by Authority";
        }
        
        await problem.save();
        res.redirect("/authority");
    } catch (e) {
        console.error("Error adding comment:", e);
        res.status(500).send("Unable to add comment. Please try again.");
    }
});

>>>>>>> ca235dc7d5477f4867ee0b99f162348ddf788928
app.listen(8000, () => {
    console.log("Server is running on port 8000");
});
