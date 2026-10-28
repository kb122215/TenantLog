const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const morgan = require("morgan");
const flash = require("connect-flash");
const methodOverride = require("method-override");

const config = require("./utils/config");
const passport = require("./config/passport");
const middleware = require("./utils/middleware");
const viewHelpers = require("./utils/viewHelpers");
const authRouter = require("./controllers/auth");
const commentsRouter = require("./controllers/comments");
const requestsRouter = require("./controllers/repairRequests");
const pagesRouter = require("./controllers/pages");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

mongoose.set("strictQuery", false);
mongoose
  .connect(config.MONGODB_URI)
  .then(() => console.log("connected to MongoDB"))
  .catch((error) =>
    console.error("error connecting to MongoDB:", error.message),
  );

if (isProduction) app.set("trust proxy", 1);

app.set("view engine", "ejs");
Object.assign(app.locals, viewHelpers);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      clientPromise: mongoose.connection
        .asPromise()
        .then((connection) => connection.getClient()),
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/requests/:id/comments", commentsRouter);
app.use("/api/requests", requestsRouter);

app.use("/", pagesRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;
