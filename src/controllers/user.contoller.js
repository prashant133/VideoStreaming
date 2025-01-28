import { asyncHanlder } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudniary } from "../utils/cloudinary.js";
import { ApiResPonse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// generate refresh token and access token
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    // Retrieve the user by ID
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Return tokens
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

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

  const avatarLocalPath =
    req.files?.avatar?.length > 0 ? req.files.avatar[0].path : null;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files?.coverImage?.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
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

const loginUser = asyncHanlder(async (req, res) => {
  // get the data from the frontend
  const { email, username, password } = req.body;

  // validate the data
  if (!(!username || !email)) {
    throw new ApiError(400, "username or email is required");
  }

  // check if the email or username is saved in database
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "No such user");
  }

  // check for the password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password is Invalid");
  }

  // generate tokens
  const { refreshToken, accessToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // it is done so that the tokens can not be modified from the frontend
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResPonse(
        200,
        { loggedInUser, accessToken, refreshToken },
        "User loggedIn Successfully"
      )
    );
});

const logoutUser = asyncHanlder(async (req, res) => {
  // refresh token is saved in the database so we should remove refreshtoken from the databae

  await User.findByIdAndUpdate(
    req.user._id, // we got the access of user from the JWTverfiy middleware
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(400)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResPonse(400, {}, "User Logged out Successfully"));
});

const refreshAccessToken = asyncHanlder(async (req, res) => {
  // To refresh the tokens, we need the refresh token from the database.
  // The refresh token can be retrieved from cookies or the request body.
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body?.refreshToken;

  // If no refresh token is provided, throw an error for unauthorized access.
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    // Verify the incoming refresh token using the secret key.
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user in the database using the user ID from the decoded token.
    const user = await User.findById(decodedToken?._id);

    // If the user doesn't exist, throw an error for an invalid refresh token.
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Check if the incoming refresh token matches the one stored in the database.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Options for setting cookies (HTTP-only for security and secure for HTTPS).
    const options = {
      httpOnly: true,
      secure: true,
    };

    // Generate a new access token and refresh token for the user.
    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    // Respond with the new tokens. Set them as HTTP-only cookies for better security.
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResPonse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    // Handle any errors during the process, such as invalid tokens or verification issues.
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHanlder(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResPonse(200), {}, "Password Changed successfuly");
});

const getCurrentUser = asyncHanlder(async (req, res) => {
  return res.status(200).json(200, req.user, "Current user fetch successfully");
});

const updateAccountDetails = asyncHanlder(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResPonse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHanlder(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "No Local file path");
  }

  const avatar = uploadOnCloudniary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading the avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResPonse(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHanlder(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "No Local file path");
  }

  const coverImage = uploadOnCloudniary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(200, "Error while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: coverImage.url,
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResPonse(200, user, "cover image updated successfully"));
});

const getUserChannelProfile = asyncHanlder(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "User not Found ");
  }

  const channel = await User.aggregate([
    {
      $match: username?.toLowercase(),
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "subscribedTo",
        },
        // this is to return if particual channel is subscribe return true or false. basically use of button in the frontend
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length > 0) {
    throw new ApiError(404, "Channel does not exists");
  }
  return res
    .status(200)
    .json(
      new ApiResPonse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHanlder(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
