import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`mongo DB Connection failed !!! ${err}`);
  });

/*
const app = express();


// using iffe to connect the database
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);

    // listener(checking if there is error in connecting dataase and express)
    app.on("error", (error) => {
      console.log("Error", error);
    });

    app.listen(`${process.env.PORT}`, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error(`Error: ${error}`);
    throw error;
  }
})();
*/
