import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// to communicate with frontend and to allow only certain server t  communicate with our backend
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// to communicate with json file and setting limit for the json so that server does not crash due to over load
app.use(express.json({ limit: "16kb" }));

// most of the url is encoded to to make machine understand this url this is done.
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// to save or communitcate with static file
app.use(express.static("public"));

// to communicate with cookie
app.use(cookieParser());

// import routes
import userRouter from "./routes/user.route.js";

// routes
app.use("/api/v1/users",userRouter);

export { app };
