import mongoose, { MongooseError } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    // making the connection with the database
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );

    console.log(
      `\n MongoDB connected! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error(`Mongo DB connection Error: ${error.message}`);
    // Exit if the connection is not successful
    process.exit(1);
  }
};

export default connectDB;
