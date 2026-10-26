require("dotenv").config();

const PORT = process.env.PORT || 3001;

const MONGODB_URI =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_MONGODB_URI
    : process.env.MONGODB_URI;

const SESSION_SECRET = process.env.SESSION_SECRET;
const LANDLORD_SIGNUP_CODE = process.env.LANDLORD_SIGNUP_CODE;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI. Check your .env file.");
}
if (!SESSION_SECRET) {
  throw new Error("Missing SESSION_SECRET. Check your .env file.");
}

module.exports = { PORT, MONGODB_URI, SESSION_SECRET, LANDLORD_SIGNUP_CODE };
