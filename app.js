const express = require("express");
const mongoose = require("mongoose");
const config = require("./utils/config");
const app = express();

mongoose.set("strictQuery", false);
mongoose
  .connect(config.MONGODB_URI)

  .then(() => console.log("connected to MongoDB"))
  .catch((error) =>
    console.error("error connecting to MongoDB:", error.message),
  );

app.use(express.json());
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

module.exports = app;
