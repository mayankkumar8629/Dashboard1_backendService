import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";


import authRoutes from "./routes/authRoutes.js";
import instagramRoutes from "./routes/instagramRoutes.js";
import tikTokRoutes from "./routes/tikTokRoutes.js";
import youTubeRoutes from ".routes/youTubeRoutes.js"

dotenv.config();

const app=express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));
const PORT=process.env.PORT || 5000;

app.use("/api/auth",authRoutes);
app.use("/api/instagram",instagramRoutes);
app.use("/api/tikTok",tikTokRoutes);
app.use("/api/youtube",youTubeRoutes);
app.get("/",(req,res)=>{
    res.send("API is running....");
});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});