const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Admin = require("./models/Admin");

dotenv.config();

const admins = [
  {
    username: "admin",
    password: "password123",
  },
  {
    username: "32signaturesmilez@gmail.com",
    password: "Dr.Deep_Datta2026",
  },
];

const seedAdmin = async () => {
  try {
    await connectDB();

    for (const adminData of admins) {
      const exists = await Admin.findOne({ username: adminData.username });
      if (exists) {
        console.log(`Admin "${adminData.username}" already exists — skipping.`);
        continue;
      }

      const admin = new Admin(adminData);
      await admin.save();
      console.log(`✅ Admin created: ${adminData.username}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
