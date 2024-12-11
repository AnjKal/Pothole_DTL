const express = require("express");
const app = express();
const mongoose = require("mongoose");
const prob = require("./models/complaints.js");

Mongo='mongodb://127.0.0.1:27017/dtl';

main()
    .then(()=>{
        console.log("connection to db sucessfull");
    })
    .catch((e)=>{
        console.log(e);
    }) 

async function main() {
    await mongoose.connect(Mongo);
}


app.get("/",(req,res)=>{
    res.send("mast plan");
})

app.listen(8000,()=>{
    console.log("port 8000 listening");
}); 