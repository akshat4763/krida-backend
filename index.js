require('dotenv').config();

const express = require('express');
const multer = require('multer');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 8000;

const cors = require('cors');
app.use(cors());
// middleware
app.use(express.json());

// multer setup
const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   1. CREATE VIDEO
========================= */
app.post("/videos", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { data, error } = await supabase
      .from("videos")
      .insert([{ user_id: userId }])
      .select();

    if (error) throw error;

    res.json({ videoId: data[0].id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create video" });
  }
});


/* =========================
   2. UPLOAD CHUNK
========================= */
app.post("/upload-chunk", upload.single("file"), async (req, res) => {
  try {
    const { videoId, chunkIndex } = req.body;
    const file = req.file;

    if (!videoId || chunkIndex === undefined) {
      return res.status(400).json({ error: "videoId and chunkIndex required" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const cleanVideoId = videoId.replace(/"/g, "");

    // ✅ CONSISTENT NAMING
    const fileName = `${cleanVideoId}_chunk_${chunkIndex}.mp4`;

    console.log("Uploading:", fileName);

    const { error: uploadError } = await supabase.storage
      .from("video")
      .upload(fileName, file.buffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // save metadata
    const { error: dbError } = await supabase
      .from("chunks")
      .insert([
        {
          video_id: cleanVideoId,
          chunk_index: parseInt(chunkIndex),
        },
      ]);

    if (dbError) throw dbError;

    res.json({ message: "Chunk uploaded successfully" });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


/* =========================
   3. COMPLETE UPLOAD
========================= */
app.post("/complete-upload", async (req, res) => {
  try {
    const { videoId, totalChunks } = req.body;

    if (!videoId || !totalChunks) {
      return res.status(400).json({ error: "videoId and totalChunks required" });
    }

    const { data, error } = await supabase
      .from("chunks")
      .select("*")
      .eq("video_id", videoId);

    if (error) throw error;

    if (data.length !== parseInt(totalChunks)) {
      return res.status(400).json({
        error: "Some chunks are missing",
        uploaded: data.length,
      });
    }

    await supabase
      .from("videos")
      .update({ status: "completed" })
      .eq("id", videoId);

    res.json({ message: "Upload completed successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Completion failed" });
  }
});


/* =========================
   4. VIDEO STREAM
========================= */
app.get("/video-stream/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const { data: chunks, error } = await supabase
      .from("chunks")
      .select("*")
      .eq("video_id", videoId)
      .order("chunk_index", { ascending: true });

    if (error) throw error;

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ error: "No chunks found" });
    }

    res.setHeader("Content-Type", "video/mp4");

    let fullBuffer = Buffer.alloc(0);

    for (const chunk of chunks) {
      // ✅ FIXED VARIABLE
      const fileName = `${videoId}_chunk_${chunk.chunk_index}.mp4`;

      console.log("Streaming:", fileName);

      const { data, error: downloadError } =
        await supabase.storage.from("video").download(fileName);

      if (downloadError) throw downloadError;

      const buffer = Buffer.from(await data.arrayBuffer());

      fullBuffer = Buffer.concat([fullBuffer, buffer]);
    }

    res.setHeader("Content-Length", fullBuffer.length);
    res.send(fullBuffer);

  } catch (err) {
    console.error("STREAM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//  5. /users

app.post("/users", async (req, res) => {
  try {
    const { name, dob, age, weight, address, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          dob,
          age,
          weight,
          address,
          email,
          phone,
        },
      ])
      .select();

    if (error) throw error;

    res.json({
      message: "User created",
      user: data[0],
    });

  } catch (err) {
    console.error("USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user

app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// need a api for sprint data gathered  

// api for user logout
//apifor delete account 
//



// admin login 
app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      adminId: data.id,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// admin votes 
app.post("/admin/vote", async (req, res) => {
  try {
    const { videoId, adminId, vote } = req.body;

    if (!videoId || !adminId || !vote) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // insert or update vote
    const { error: voteError } = await supabase
      .from("votes")
      .upsert({
        athlete_id: videoId,
        admin_id: adminId,
        vote: vote,
      });

    if (voteError) throw voteError;

    // get all votes
    const { data: votes, error } = await supabase
      .from("votes")
      .select("*")
      .eq("athlete_id", videoId);

    if (error) throw error;

    // 🔴 IF ANY REJECT → REJECTED
    if (votes.some(v => v.vote === "reject")) {
      await supabase
        .from("videos")
        .update({ status: "rejected" })
        .eq("id", videoId);

      return res.json({ status: "rejected" });
    }

    // 🟢 IF ALL 4 APPROVE → APPROVED
    if (votes.length === 4 && votes.every(v => v.vote === "approve")) {
      await supabase
        .from("videos")
        .update({ status: "approved" })
        .eq("id", videoId);

      return res.json({ status: "approved" });
    }

    // 🟡 OTHERWISE → PENDING
    res.json({ status: "pending" });

  } catch (err) {
    console.error("VOTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// debugging for postman only 
app.get("/admin/votes/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .eq("athlete_id", videoId);

    if (error) throw error;

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



//admin to fetch all user+vidoes
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        videos (
          id,
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});







/* =========================
   SERVER START
========================= */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});