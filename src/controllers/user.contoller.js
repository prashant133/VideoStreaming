import { asyncHanlder } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudniary } from "../utils/cloudinary.js";
import { ApiResPonse } from "../utils/ApiResponse.js";

const registerUser = asyncHanlder(async (req, res) => {
  // taking the data from user
  const { username, email, fullName, password } = req.body;

  // validate the data
  if (
    [username, email, fullName, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All Fields are required");
  }

  // check for the existing users
  const exisitedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exisitedUser) {
    new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files?.coverImage?.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is required");
  }

  // now upload the file in cloudinary
  const avatar = await uploadOnCloudniary(avatarLocalPath);
  const coverImage = await uploadOnCloudniary(coverImageLocalPath);

  // check for the avatar
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  // create  a user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // check if user is actually  created on the database
  if (!createdUser) {
    throw new ApiError(500, "Something Went wrong while regestering the user");
  }
  return res
    .status(201)
    .json(new ApiResPonse(200, createdUser, "User Created Successfully"));
});

export { registerUser };
