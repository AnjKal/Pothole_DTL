const mongoose = require("mongoose");
const schema = mongoose.Schema;

const sch = new schema({
    type:String,
    image:String,
    details:String,
    severity:Number,
    location:String,
});

const prob = mongoose.model("prob",sch);
module.exports = prob; 