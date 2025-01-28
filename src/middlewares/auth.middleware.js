import { ApiError } from "../utils/ApiError.js";
import { asyncHanlder } from "../utils/asynHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHanlder(async (req, _, next) => {
  try {
    // Retrieve the token from either cookies or the Authorization header.
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "").trim();

    // If no token is provided, throw an error for unauthorized access.
    if (!token) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Verify the token using the secret key and decode the payload.
    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fetch the user from the database using the decoded user ID.
    // Exclude sensitive fields like password and refreshToken from the query result.
    const user = await User.findById(decodeToken?._id).select(
      "-password -refreshToken"
    );

    // If the user does not exist, throw an error indicating an invalid token.
    if (!user) {
      throw new ApiError(401, "Invalid Token");
    }

    // Attach the user information to the request object for further use.
    req.user = user;

    // Pass control to the next middleware in the stack.
    next();
  } catch (error) {
    // Handle any errors that occur, such as invalid tokens or verification failures.
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
