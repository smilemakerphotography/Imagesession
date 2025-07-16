const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const sharp = require("sharp");
const cors = require("cors");
const app = express();

mongoose.connect("mongodb://127.0.0.1:27017/webpsessions", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const PhotoSchema = new mongoose.Schema({
  session: String,
  filename: String,
  data: Buffer,
  contentType: String,
});

const SelectionSchema = new mongoose.Schema({
  session: String,
  selectedFilenames: [String],
  timestamp: { type: Date, default: Date.now },
});

const Photo = mongoose.model("Photo", PhotoSchema);
const Selection = mongoose.model("Selection", SelectionSchema);

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.array("images"), async (req, res) => {
  try {
    const sessionName = req.body.sessionName;
    const images = req.files;

    if (!sessionName || !images || images.length === 0) {
      return res.status(400).json({ error: "Session name and images required" });
    }

    for (const img of images) {
      const webpBuffer = await sharp(img.buffer).webp({ quality: 70 }).toBuffer();

      await Photo.create({
        session: sessionName,
        filename: img.originalname.replace(/\.[^/.]+$/, ".webp"),
        data: webpBuffer,
        contentType: "image/webp",
      });
    }

    res.json({ message: "Images uploaded successfully" });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server error during upload" });
  }
});

app.get("/photos/:session", async (req, res) => {
  try {
    const photos = await Photo.find({ session: req.params.session });
    if (!photos || photos.length === 0) {
      return res.status(404).json({ error: "No images found for this session" });
    }
    res.json(
      photos.map((photo) => ({
        id: photo._id,
        filename: photo.filename,
        data: photo.data.toString("base64"),
        contentType: photo.contentType,
      }))
    );
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error during fetch" });
  }
});

app.post("/select/:session", async (req, res) => {
  try {
    const { session } = req.params;
    const { selected } = req.body;

    if (!Array.isArray(selected)) {
      return res.status(400).json({ error: "Selected must be an array" });
    }

    await Selection.create({ session, selectedFilenames: selected });
    res.json({ message: "Selection saved" });
  } catch (err) {
    console.error("Selection error:", err);
    res.status(500).json({ error: "Server error during selection save" });
  }
});

app.get("/sessions", async (req, res) => {
  try {
    const sessions = await Selection.find().sort({ timestamp: -1 });
    res.json(sessions);
  } catch (err) {
    console.error("Sessions fetch error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));