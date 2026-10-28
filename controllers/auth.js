const bcrypt = require("bcrypt");
const authRouter = require("express").Router();
const passport = require("../config/passport");
const User = require("../models/user");
const config = require("../utils/config");
const { requireAuth } = require("../utils/middleware");

const MIN_PASSWORD_LENGTH = 8;

// POST /api/auth/signup
authRouter.post("/signup", async (req, res, next) => {
  const {
    email,
    password,
    name,
    role = "tenant",
    landlordCode,
  } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
  }
  if (!User.ROLES.includes(role)) {
    return res
      .status(400)
      .json({ error: `Role must be one of: ${User.ROLES.join(", ")}` });
  }
  if (
    role === "landlord" &&
    (!config.LANDLORD_SIGNUP_CODE ||
      landlordCode !== config.LANDLORD_SIGNUP_CODE)
  ) {
    return res
      .status(403)
      .json({
        error: "A valid landlord code is required to sign up as a landlord",
      });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await new User({ email, name, role, passwordHash }).save();

  req.login(user, (error) => {
    if (error) return next(error);
    res.status(201).json(user);
  });
});

// POST /api/auth/login
authRouter.post("/login", (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return next(error);
    if (!user)
      return res
        .status(401)
        .json({ error: info?.message ?? "Invalid email or password" });

    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      res.json(user);
    });
  })(req, res, next);
});

// POST /api/auth/logout
authRouter.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(204).end();
    });
  });
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = authRouter;
