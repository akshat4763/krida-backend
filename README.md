# Krida Backend API

## Overview

The Krida Backend API is a Node.js-based system designed to support a fitness assessment platform. It enables user management, video upload via chunking, storage integration, and video streaming for administrative review.

The backend is built using Express and integrates with Supabase for database and storage services.

---

## Features

* User profile creation and management
* Chunk-based video upload system
* Secure video storage using Supabase
* Video reconstruction and streaming
* Admin-level access to users and their videos

---

## Tech Stack

| Layer      | Technology            |
| ---------- | --------------------- |
| Backend    | Node.js (Express)     |
| Database   | Supabase (PostgreSQL) |
| Storage    | Supabase Storage      |
| Deployment | Render                |

---

## Base URL

```
https://your-backend.onrender.com
```

---

## Environment Variables

Create a `.env` file in the root directory and configure the following:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
PORT=8000
```

---

## Installation and Setup

Clone the repository and install dependencies:

```
git clone <your-repo-url>
cd backend
npm install
```

Run the server:

```
npm start
```

---

## API Endpoints

### 1. Create User

**POST** `/users`

Creates a new user profile.

#### Request Body

```
{
  "name": "Akshat",
  "dob": "2003-05-10",
  "age": 22,
  "weight": 65,
  "address": "Prayagraj",
  "email": "akshat@gmail.com",
  "phone": "9876543210"
}
```

---

### 2. Get User by ID

**GET** `/users/:id`

Returns a single user's profile.

---

### 3. Get All Users (Admin)

**GET** `/users`

Returns all users along with their associated videos.

---

### 4. Create Video

**POST** `/videos`

Creates a new video entry.

#### Request Body

```
{
  "userId": "uuid"
}
```

#### Response

```
{
  "videoId": "uuid"
}
```

---

### 5. Upload Video Chunk

**POST** `/upload-chunk`

Uploads a video chunk.

#### Content-Type

```
multipart/form-data
```

#### Fields

| Field      | Type | Description           |
| ---------- | ---- | --------------------- |
| file       | File | Video chunk file      |
| videoId    | Text | Video identifier      |
| chunkIndex | Text | Chunk sequence number |

---

### 6. Complete Upload

**POST** `/complete-upload`

Marks the video upload as complete after all chunks are uploaded.

#### Request Body

```
{
  "videoId": "uuid",
  "totalChunks": 3
}
```

---

### 7. Stream Video

**GET** `/video-stream/:videoId`

Streams a video by combining all uploaded chunks.

---

## Database Schema

### Users Table

| Column     | Type      |
| ---------- | --------- |
| id         | UUID      |
| name       | TEXT      |
| dob        | DATE      |
| age        | INT       |
| weight     | FLOAT     |
| address    | TEXT      |
| email      | TEXT      |
| phone      | TEXT      |
| created_at | TIMESTAMP |

---

### Videos Table

| Column     | Type      |
| ---------- | --------- |
| id         | UUID      |
| user_id    | UUID      |
| status     | TEXT      |
| created_at | TIMESTAMP |

---

### Chunks Table

| Column      | Type      |
| ----------- | --------- |
| id          | UUID      |
| video_id    | UUID      |
| chunk_index | INT       |
| created_at  | TIMESTAMP |

---

## System Workflow

1. A user profile is created
2. The user records a video
3. The video is split into chunks on the client
4. Chunks are uploaded sequentially
5. Upload is finalized
6. Video becomes available for streaming
7. Admin panel retrieves and displays user data and videos

---

## Storage Strategy

* Bucket Name: `video`
* File Naming Convention:

  ```
  videoId_chunk_index.mp4
  ```
* Each video is reconstructed dynamically during streaming

---

## Deployment

The backend is deployed on Render.

Steps:

1. Push code to GitHub
2. Create a new Web Service on Render
3. Set environment variables
4. Deploy

---

## Important Notes

* The backend uses Supabase service role key for full access
* Row Level Security should be configured appropriately in production
* Current streaming implementation loads full video into memory (not optimized for large files)

---

## Future Improvements

* Range-based streaming support
* Authentication and authorization system
* Video analytics (explosiveness, speed, form scoring)
* Admin dashboard enhancements
* Optimized chunk streaming (HLS/DASH)

---

## Author

Akshat Sharma
