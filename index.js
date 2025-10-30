// index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = ["http://localhost:3030/", "https://sathiplanners.com/", "https://sathiplanners.com"];

// Security middlewares
app.use(helmet());
// app.use(cors({
//   origin: process.env.FRONTEND_ORIGIN || '*' // tighten this in production
// }));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic rate limiting to slow down spam
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Multer config: store files in memory (no disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB limit. Adjust as required.
  },
  fileFilter: (req, file, cb) => {
    // OPTIONAL: restrict to common safe types
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  }
});

// ✅ Health checks
app.get("/", (req, res) => res.json("Hello, API is working !!"));

app.get("/health", (req, res) => res.json({ status: "healthy" }));

// POST endpoint receives form fields and a single file input named "file"
// app.post("/contactus", upload.single("file"), async (req, res) => {
//   try {
//     const {
//       full_name,
//       phone_number,
//       email_id,
//       organization,
//       subject,
//       inquiry_details
//     } = req.body;

//     // ✅ Required & Format Validation
//     if (!full_name || !phone_number || !email_id) {
//       return res.status(400).json({ error: "Full Name, Phone Number and Email are required" });
//     }

//     // Email validation (basic)
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email_id)) {
//       return res.status(400).json({ error: "Invalid email format" });
//     }

//     // Phone validation (10-15 digits)
//     const phoneRegex = /^[0-9]{10,15}$/;
//     if (!phoneRegex.test(phone_number)) {
//       return res.status(400).json({ error: "Invalid phone number" });
//     }

//     // ✅ Load email template
//     const templatePath = path.join(__dirname, "templates/contactUs.html");
//     let htmlTemplate = fs.readFileSync(templatePath, "utf8");

//     htmlTemplate = htmlTemplate
//       .replace(/{{full_name}}/g, escapeHtml(full_name))
//       .replace(/{{phone_number}}/g, escapeHtml(phone_number))
//       .replace(/{{email_id}}/g, escapeHtml(email_id))
//       .replace(/{{organization}}/g, escapeHtml(organization || "-"))
//       .replace(/{{subject}}/g, escapeHtml(subject || "-"))
//       .replace(/{{inquiry_details}}/g, nl2br(escapeHtml(inquiry_details || "-")));

//     // Email Config
//     const transporter = nodemailer.createTransport({
//       service: process.env.EMAIL_SERVICE || "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: `"Website Contact" <${process.env.EMAIL_USER}>`,
//       to: process.env.RECEIVER_EMAIL,
//       subject: subject || "New Inquiry",
//       html: htmlTemplate,
//       attachments: []
//     };

//     if (req.file) {
//       mailOptions.attachments.push({
//         filename: req.file.originalname,
//         content: req.file.buffer,
//         contentType: req.file.mimetype,
//       });
//     }

//     await transporter.sendMail(mailOptions);

//     res.json({ message: "✅ Submission successful. We will contact you soon!" });

//   } catch (err) {
//     console.error("Error /contactus :: ", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

app.post("/contactus", upload.single("documents"), async (req, res) => {
  try {
    const {
      full_name,
      phone,
      email,
      what_describes_you_best,
      YOE,
      highest_qualification,
      current_org,
      location
    } = req.body;

    // ✅ Required Field Validation
    if (!full_name || !phone || !email) {
      return res.status(400).json({ error: "Full Name, Phone Number and Email are required" });
    }

    // ✅ Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // ✅ Phone validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // ✅ Load & Build Email Template
    const templatePath = path.join(__dirname, "templates/contactUs.html");
    let htmlTemplate = fs.readFileSync(templatePath, "utf8");

    htmlTemplate = htmlTemplate
      .replace(/{{full_name}}/g, escapeHtml(full_name))
      .replace(/{{phone}}/g, escapeHtml(phone))
      .replace(/{{email}}/g, escapeHtml(email))
      .replace(/{{what_describes_you_best}}/g, escapeHtml(what_describes_you_best || "-"))
      .replace(/{{YOE}}/g, escapeHtml(YOE || "-"))
      .replace(/{{highest_qualification}}/g, escapeHtml(highest_qualification || "-"))
      .replace(/{{current_org}}/g, escapeHtml(current_org || "-"))
      .replace(/{{location}}/g, escapeHtml(location || "-"));

    // ✅ Email Config
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Website Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: "New Contact Submission",
      html: htmlTemplate,
      attachments: []
    };

    // ✅ If File Attached
    if (req.file) {
      mailOptions.attachments.push({
        filename: req.file.originalname,
        content: req.file.buffer,
        contentType: req.file.mimetype,
      });
    }

    await transporter.sendMail(mailOptions);

    res.json({ message: "✅ Submission successful. We will contact you soon!" });

  } catch (error) {
    console.error("Error /contactus :: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Helpers to prevent HTML injection and preserve newlines
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function nl2br(text) {
  return text.replace(/\r?\n/g, '<br/>');
}

// const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
