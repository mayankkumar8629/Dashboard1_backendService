import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app=express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
const PORT=process.env.PORT || 5000;
app.get("/",(req,res)=>{
    res.send("API is running....");
});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});