const authRouter = require("express").Router();
const passport = require("../config/passport");
const { createUser } = require("../services/users");
const { requireAuth } = require("../utils/middleware");

// POST /api/auth/signup  { email, password, name?, role?, landlordCode? }
authRouter.post("/signup", async (req, res, next) => {
  const user = await createUser(req.body ?? {});

  // Log them straight in after signing up
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
