const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://autoparts:mugesh12121@cluster0.imo3n03.mongodb.net/autoparts?retryWrites=true&w=majority"
    );
    console.log("MongoDB Connected Successfully 🚀");
  } catch (error) {
    console.log("MongoDB Connection Failed ❌");
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;