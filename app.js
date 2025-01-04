const express = require("express");
const mongoose = require("mongoose");
const prob = require("./models/complaints.js");
const path = require("path");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");
const multer = require("multer");
const fs = require("fs");

const app = express();
Mongo = 'mongodb://127.0.0.1:27017/dtl';

// Connect to MongoDB
main()
    .then(() => {
        console.log("Connection to DB successful");
    })
    .catch((e) => {
        console.log(e);
    });

async function main() {
    await mongoose.connect(Mongo);
}

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

// Routes

app.get("/", (req, res) => {
    res.render("landing");
});

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

app.get("/citizen/add", (req, res) => {
    res.render("add");
});

app.post("/citizen/add", upload.single("image"), async (req, res) => {
    const { type, details, severity, location } = req.body;
    const imagePath = req.file ? req.file.filename : ""; 

    await prob.create({ type, image: imagePath, details, severity, location });
    res.redirect("/citizen");
});

app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    await prob.findByIdAndDelete(id);
    res.redirect("/authority");
});

app.get("/authority", async (req, res) => {
    const problems = await prob.find({});
    res.render("authority", { problems });
});

app.post("/authority/status/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const problem = await prob.findById(id);
        if (problem) {
            problem.status = status;
            await problem.save();
        }
        res.redirect("/authority");
    } catch (e) {
        console.error("Error updating status:", e);
        res.status(500).send("Unable to update status. Please try again.");
    }
});

app.post("/authority/comment/:id", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    try {
        const problem = await prob.findById(id);
        
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

app.listen(8000, () => {
    console.log("Server is running on port 8000");
});
