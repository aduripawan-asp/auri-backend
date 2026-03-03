require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  language: { type: String, default: "en" }
});

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// Register
app.post("/register", async (req, res) => {
  const { username, email, password, language } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashed, language });
  await user.save();
  res.json({ message: "User created" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id }, "SECRET");
  res.json({ token, username: user.username, language: user.language });
});

// Socket
io.on("connection", (socket) => {
  socket.on("sendMessage", async (data) => {
    const message = new Message(data);
    await message.save();
    io.emit("receiveMessage", message);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running"));
