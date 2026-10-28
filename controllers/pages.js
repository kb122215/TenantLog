const pagesRouter = require("express").Router();
const passport = require("../config/passport");
const repairs = require("../services/repairs");
const { createUser } = require("../services/users");
const HttpError = require("../utils/httpError");

const NEXT_STEPS = {
  Open: [
    {
      to: "In Progress",
      label: "Start work",
      icon: "hammer",
      style: "btn-primary",
    },
    {
      to: "Resolved",
      label: "Mark resolved",
      icon: "circle-check",
      style: "btn-secondary",
    },
  ],
  "In Progress": [
    {
      to: "Resolved",
      label: "Mark resolved",
      icon: "circle-check",
      style: "btn-primary",
    },
    {
      to: "Open",
      label: "Move back to Open",
      icon: "rotate-left",
      style: "btn-ghost",
    },
  ],
  Resolved: [
    {
      to: "Open",
      label: "Reopen",
      icon: "rotate-left",
      style: "btn-secondary",
    },
  ],
};

// ---------- Middleware ----------

// Values every view can use: who's logged in, and any flash messages
pagesRouter.use((req, res, next) => {
  res.locals.currentUser = req.user ?? null;
  // Only read flash when there is some, so visitors don't all get a session cookie
  res.locals.flash = req.session?.flash
    ? { error: req.flash("error"), success: req.flash("success") }
    : { error: [], success: [] };
  next();
});

// Page guard: same as savage auth's isLoggedIn
const requireLogin = (req, res, next) =>
  req.isAuthenticated() ? next() : res.redirect("/login");

const redirectIfLoggedIn = (req, res, next) =>
  req.isAuthenticated() ? res.redirect("/dashboard") : next();

// Turns an expected error into a message for the page; anything unexpected goes to the error page
const messageFor = (error) => {
  if (error instanceof HttpError) return error.message;
  if (error.name === "ValidationError") {
    return Object.values(error.errors)
      .map((detail) => detail.message)
      .join(". ");
  }
  throw error;
};

// ---------- Login, signup, logout ----------

pagesRouter.get("/", (req, res) => {
  res.redirect(req.isAuthenticated() ? "/dashboard" : "/login");
});

pagesRouter.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("auth", { mode: "login", values: {}, formError: null });
});

pagesRouter.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("auth", { mode: "signup", values: {}, formError: null });
});

pagesRouter.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true, // uses the message from config/passport.js
  }),
);

pagesRouter.post("/signup", async (req, res, next) => {
  const body = req.body ?? {};

  try {
    const user = await createUser(body);
    req.login(user, (error) => {
      if (error) return next(error);
      req.flash("success", "Welcome to RepairTrail!");
      res.redirect("/dashboard");
    });
  } catch (error) {
    // Show the form again with what they typed, minus the password and code
    const { password, landlordCode, ...values } = body;
    res
      .status(error.status ?? 400)
      .render("auth", { mode: "signup", values, formError: messageFor(error) });
  }
});

pagesRouter.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.flash("success", "You have been logged out.");
    res.redirect("/login");
  });
});
const renderDashboard = async (req, res, extra = {}) => {
  // Ignore filter values that aren't real options instead of erroring
  const filters = {
    status: repairs.STATUSES.includes(req.query.status) ? req.query.status : "",
    urgency: repairs.URGENCIES.includes(req.query.urgency)
      ? req.query.urgency
      : "",
  };

  const [list, stats] = await Promise.all([
    repairs.listRepairs(req.user, filters),
    repairs.getStats(req.user),
  ]);

  res.status(extra.status ?? 200).render("dashboard", {
    repairs: list,
    stats,
    filters,
    statuses: repairs.STATUSES,
    urgencies: repairs.URGENCIES,
    showForm: extra.showForm ?? false,
    values: extra.values ?? {},
    formError: extra.formError ?? null,
  });
};

pagesRouter.get("/dashboard", requireLogin, (req, res) =>
  renderDashboard(req, res),
);

pagesRouter.post("/requests", requireLogin, async (req, res) => {
  try {
    const repair = await repairs.createRepair(req.user, req.body ?? {});
    req.flash("success", "Repair request submitted.");
    res.redirect(`/requests/${repair.id}`);
  } catch (error) {
    await renderDashboard(req, res, {
      status: 400,
      showForm: true,
      values: req.body ?? {},
      formError: messageFor(error),
    });
  }
});

const requestUrl = (repair) => `/requests/${repair.id}`;

const renderRequest = async (req, res, repair, extra = {}) => {
  const comments = await repairs.listComments(repair);
  const canEdit = repairs.canEdit(repair, req.user);

  res.status(extra.status ?? 200).render("request", {
    repair,
    comments,
    canEdit,
    canCancel: repairs.canCancel(repair, req.user),
    nextSteps: NEXT_STEPS[repair.status],
    urgencies: repairs.URGENCIES,
    editing: Boolean(extra.editing) && canEdit,
    values: extra.values ?? repair,
    formError: extra.formError ?? null,
  });
};

pagesRouter.get("/requests/:id", requireLogin, async (req, res) => {
  const repair = await repairs.findRepairFor(req.params.id, req.user);
  await renderRequest(req, res, repair, { editing: req.query.edit === "1" });
});

// Edit details  (form: POST /requests/:id?_method=PATCH)
pagesRouter.patch("/requests/:id", requireLogin, async (req, res) => {
  const repair = await repairs.findRepairFor(req.params.id, req.user);

  try {
    await repairs.updateRepair(repair, req.user, req.body ?? {});
    req.flash("success", "Changes saved.");
    res.redirect(requestUrl(repair));
  } catch (error) {
    const message = messageFor(error);
    const fresh = await repairs.findRepairFor(req.params.id, req.user); // undo the unsaved changes

    if (!repairs.canEdit(fresh, req.user)) {
      req.flash("error", message);
      return res.redirect(requestUrl(fresh));
    }
    await renderRequest(req, res, fresh, {
      status: 400,
      editing: true,
      values: req.body ?? {},
      formError: message,
    });
  }
});

// Change status  (form: POST /requests/:id/status?_method=PATCH)
pagesRouter.patch("/requests/:id/status", requireLogin, async (req, res) => {
  const repair = await repairs.findRepairFor(req.params.id, req.user);
  const status = req.body?.status;

  try {
    await repairs.changeStatus(repair, req.user, status);
    req.flash("success", `Status changed to ${status}.`);
  } catch (error) {
    req.flash("error", messageFor(error));
  }
  res.redirect(requestUrl(repair));
});

// Cancel  (form: POST /requests/:id?_method=DELETE)
pagesRouter.delete("/requests/:id", requireLogin, async (req, res) => {
  const repair = await repairs.findRepairFor(req.params.id, req.user);

  try {
    await repairs.cancelRepair(repair, req.user);
    req.flash("success", "Repair request cancelled.");
    res.redirect("/dashboard");
  } catch (error) {
    req.flash("error", messageFor(error));
    res.redirect(requestUrl(repair));
  }
});

pagesRouter.post("/requests/:id/comments", requireLogin, async (req, res) => {
  const repair = await repairs.findRepairFor(req.params.id, req.user);

  try {
    await repairs.addComment(repair, req.user, req.body?.text);
  } catch (error) {
    req.flash("error", messageFor(error));
  }
  res.redirect(`${requestUrl(repair)}#comments`);
});

// Catches errors from the routes above and shows a friendly page instead of JSON
pagesRouter.use((error, req, res, next) => {
  const notFound = error.name === "CastError" || error.status === 404;
  const status = notFound ? 404 : (error.status ?? 500);
  if (status === 500) console.error(error);

  let message = error.message;
  if (notFound) message = "That repair request could not be found.";
  else if (status === 500)
    message = "Something went wrong on our end. Please try again.";

  res.status(status).render("error", { status, message });
});

module.exports = pagesRouter;
