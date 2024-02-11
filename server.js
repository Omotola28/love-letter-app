const express = require("express");
require('dotenv').config()
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
const cors = require("cors");

const app = express();
const db = new sqlite3.Database("./db/continents.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the continents database.");
  }
});
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS continent_counts (continent TEXT PRIMARY KEY, count INTEGER DEFAULT 0)"
  );
  // Pre-populate the table with continents
  const continents = [
    "Africa",
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Australia",
    "Antarctica",
  ];
  continents.forEach((continent) => {
    db.run(
      "INSERT OR IGNORE INTO continent_counts (continent, count) VALUES (?, 0)",
      [continent]
    );
  });
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL,
    pass: process.env.PASSWORD
  },
});

// Serve the form page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/continent-counts", (req, res) => {
  db.all("SELECT continent, count FROM continent_counts", [], (err, rows) => {
    if (err) {
      console.error("Query error:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Handle form submission
app.post("/update-count", (req, res) => {
  const { continent } = req.body;
  db.run(
    "UPDATE continent_counts SET count = count + 1 WHERE continent = ?",
    [continent],
    function (err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(`Updated count for ${continent}`);
      res.redirect("/");
    }
  );
});

app.post("/send-email", (req, res) => {
  const { email, message } = req.body;

  const mailOptions = {
    from: "loveletterapp1414@gmail.com",
    to: email,
    subject: "Love Letter",
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending mail:", error);
      // Ensure the response is a JSON object
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to send email",
          error: error.toString(),
        });
    } else {
      console.log("Email sent:", info.response);
      // Ensure the response is a JSON object
      res.json({ success: true, message: "Email sent successfully" });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
