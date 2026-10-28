# TenantLog

**Every repair, on the record.**

TenantLog is a repair request tracker for renters and landlords. Tenants report a problem once, landlords update its status, both sides talk it through in a comment thread, and every change is timestamped, so the tenant has a paper trail if there's ever a dispute.

### 🔗 [Open the live app on Render](https://tenantlog.onrender.com/login)

![TenantLog login page](docs/screenshots/login.png)

![TenantLog tenant dashboard](docs/screenshots/dashboard.png)

---

## The problem

Renters usually text their landlord about a leaky faucet. The message gets buried, nobody remembers when it was reported or whether it was fixed, and the tenant has no record if there's ever a disagreement about it.

## How it works

1. **A tenant signs up** and reports a repair with a title, details, room and urgency level.
2. **Every request starts as Open** and moves through **In Progress** to **Resolved**.
3. **The tenant and landlord comment** on the request to go back and forth.
4. **The paper trail** records every status change: who made it and exactly when.
5. **The dashboard** shows counts by status and the **average days to fix**.

## Features

- **Accounts with two roles.** Tenants see only their own requests. Landlords see every request, and need a landlord code to sign up.
- **Full CRUD on repair requests:**
  - **Create** a request, and add comments.
  - **Read** a dashboard, filtered by status and urgency.
  - **Update** the details, or move the status forward and back.
  - **Delete** (cancel) a request submitted by mistake.
- **A paper trail that can't be erased.**
  - A request can only be cancelled while it's still Open.
  - Resolved requests are locked from editing.
- **Privacy.** A tenant who tries to open someone else's request gets "not found," so request ids can't be probed.
- **Two ways in, one set of rules:**
  - Server-rendered **EJS pages**
  - A **JSON API** for testing

  Both call the same `services/` code, so they can never disagree about who's allowed to do what.

## Tech stack

| Tools    |
| -------- | ----------------------------------------------------------- |
| Server   | Node.js, Express 5                                          |
| Database | MongoDB Atlas, Mongoose                                     |
| Login    | Passport                                                    |
| Pages    | EJS templates                                               |
| Styling  | Hand-written CSS, Oswald (Google Fonts), Font Awesome icons |
| Hosting  | Render                                                      |

## Try it

Open the [live app](https://tenantlog.onrender.com) and either:

- **Sign up as a tenant** with any email and an 8+ character password, then report a repair.
- **Or use the demo tenant account:** `demo-tenant@example.com` / `demo-password-123`

- **Login as the landlord** `demo-landlord@example.com` / `demo-password-123`

---

## Run it on your own computer

### What you need

- [Node.js](https://nodejs.org) 20 or newer
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### Steps

1. **Clone the repo and install packages:**

```bash
   git clone https://github.com/kb122215/TenantLog.git
   cd TenantLog
   npm install
```

2. **Create a `.env` file** in the project folder, next to `package.json`:

```
   PORT=3001
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tenantlog?retryWrites=true&w=majority
   SESSION_SECRET=<any long random string>
   LANDLORD_SIGNUP_CODE=<a code landlords must enter to sign up>
```

To generate a session secret:

```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Start the server:**

```bash
   npm run dev
```

4. **Open [http://localhost:3001](http://localhost:3001)** in your browser.

`npm run dev` restarts the server whenever you save a file. Use `npm start` to run it without restarting.

---

## Project structure

```
index.js                       starts the server
app.js                         middleware, sessions, views and routes
config/passport.js             login check and session setup
services/users.js              signup rules
services/repairs.js            repair request and comment rules
controllers/pages.js           EJS pages: forms post here, then redirect
controllers/auth.js            API: signup, login, logout, me
controllers/repairRequests.js  API: requests, status changes, stats
controllers/comments.js        API: comment threads
models/                        User, RepairRequest, Comment
views/                         EJS templates and partials
public/                        styles.css and main.js
utils/                         config, middleware, HttpError, view helpers
requests.http                  manual API tests (VS Code REST Client)
```

## What I learned

- **Session-based authentication with Passport,** and keeping sessions in MongoDB so logins survive a server restart.
- **Separating rules from routes.** Moving the business logic into `services/` let the JSON API and the EJS pages share it, so neither can drift from the other.
- **Designing for a paper trail:** status history, locked records, and timestamps that can't be edited.
- **Security basics:** password hashing, escaping user input in templates, hiding which records exist, and never trusting fields like `status` or `user` sent from the browser.
