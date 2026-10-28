const bcrypt = require("bcrypt");
const User = require("../models/user");
const config = require("../utils/config");
const HttpError = require("../utils/httpError");

const MIN_PASSWORD_LENGTH = 8;

// Signup rules live here so the JSON API and the EJS signup form follow the same ones
const createUser = async ({
  email,
  password,
  name,
  role = "tenant",
  landlordCode,
} = {}) => {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    throw new HttpError(400, "Email and password are required");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
  if (!User.ROLES.includes(role)) {
    throw new HttpError(400, `Role must be one of: ${User.ROLES.join(", ")}`);
  }
  if (
    role === "landlord" &&
    (!config.LANDLORD_SIGNUP_CODE ||
      landlordCode !== config.LANDLORD_SIGNUP_CODE)
  ) {
    throw new HttpError(
      403,
      "A valid landlord code is required to sign up as a landlord",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    return await new User({
      email,
      name: name || undefined,
      role,
      passwordHash,
    }).save();
  } catch (error) {
    if (error.code === 11000)
      throw new HttpError(400, "That email is already registered");
    throw error;
  }
};

module.exports = { createUser, MIN_PASSWORD_LENGTH };
