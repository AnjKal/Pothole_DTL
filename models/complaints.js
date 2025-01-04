const mongoose = require("mongoose");
const schema = mongoose.Schema;

const sch = new schema({
    type:String,
    problem:String,
    image:String,
    details:String,
    severity:Number,
    location:String,
    comments: [{ text: String, date: Date }],
    status: { type: String, default: "Complaint Received" }
});

const prob = mongoose.model("prob",sch);
module.exports = prob; 