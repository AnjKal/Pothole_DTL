const express = require("express");
const mongoose = require("mongoose");
const prob = require("./models/complaints.js");
const path = require("path");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");

const app = express();
Mongo = 'mongodb://127.0.0.1:27017/dtl';

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

// Middleware
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes

app.get("/", (req, res) => {
    res.render("landing");
});


app.get("/citizen", async (req, res) => {
    const problems = await prob.find({});
    res.render("index", { problems });
});

app.get("/citizen/add", (req, res) => {
    res.render("add");
});

app.post("/citizen/add", async (req, res) => {
    const { type, image, details, severity, location } = req.body;
    await prob.create({ type, image, details, severity, location });
    res.redirect("/citizen");
});

app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    await prob.findByIdAndDelete(id);
    res.redirect("/citizen");
});


app.get("/authority", async (req, res) => {
    const problems = await prob.find({});
    res.render("authority", { problems });
});

app.post("/authority/comment/:id", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    const problem = await prob.findById(id);
    problem.comments.push({ text: comment, date: new Date() });
    await problem.save();

    res.redirect("/authority");
});



app.listen(8000, () => {
    console.log("Server is running on port 8000");
});
