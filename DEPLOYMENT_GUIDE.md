# E-RISE Platform: Complete Deployment & Operations Manual

This guide walks you through deploying the complete **E-RISE Streaming & Meeting Platform** across **GitHub**, **Supabase**, **Render**, **Resend**, and **Firebase Hosting** (with custom domain).

---

## 1. Push to GitHub

1. Create a new repository on [GitHub](https://github.com/new), for example `erise-meeting-platform`.
2. Connect your local git repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/erise-meeting-platform.git
   git push -u origin main
   ```

---

## 2. Supabase Setup (Auth & PostgreSQL DB)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase Dashboard.
3. Open `supabase/schema.sql` from this repository, paste its contents into the SQL Editor, and click **Run**.
   - This sets up `profiles`, `meetings`, `meeting_participants`, `chat_messages`.
   - It installs the atomic quota enforcement function `join_meeting_with_quota_check`.
   - It enables Row-Level Security (RLS) and sets up the `avatars` storage bucket.
4. Go to **Project Settings > API** and copy:
   - `Project URL` (e.g., `https://xyzcompany.supabase.co`)
   - `anon public key`
5. Optional: Add `erise.club@hns-re2sd.dz` as an invited user or admin in **Authentication > Users**.

---

## 3. Render Deployment (Dual Backend: Python + Java)

The repository includes a ready-to-use `render.yaml` blueprint.

1. Log in to [render.com](https://render.com).
2. Click **New + > Blueprint**.
3. Select your GitHub repository `erise-meeting-platform`.
4. Render will detect `render.yaml` and configure two services:
   - **`erise-signaling-service`** (Python 3.12 / FastAPI WebSockets, Port 8000)
   - **`erise-core-service`** (Java 21 / Spring Boot Quota & Lifecycle API, Port 8080)
5. Provide your environment variables when prompted:
   - `RESEND_API_KEY`: Your Resend API token (`re_...`)
   - `RESEND_ADMIN_EMAIL`: `erise.club@hns-re2sd.dz`
   - `CORS_ALLOWED_ORIGINS`: `*` or your Firebase custom domain.
6. Click **Apply**. Both services will build and deploy via Docker containers.
7. Note down your public service URLs:
   - Python Signaling: `wss://erise-signaling-service.onrender.com/ws`
   - Java Core: `https://erise-core-service.onrender.com/api`

---

## 4. Participant Capacity Breakdown on Render

> **"How much can it hold in one meet like 10 participants or something like this?"**

* **Signaling Server (Python FastAPI on Render Starter - 512MB RAM, 0.5 vCPU)**:
  - WebSockets only handle JSON metadata (SDP Offers/Answers, ICE candidates, host mute/unmute events, hand raises).
  - Memory consumption is ~80–120 MB. It can easily handle **3,000+ simultaneous connected users**.
* **Media Streams (WebRTC Peer-to-Peer Mesh with DTLS-SRTP)**:
  - In a P2P mesh, video and audio streams flow **directly between participant browsers** (encrypted via DTLS-SRTP). Render bandwidth consumption for media is **0 MB**.
  - Each participant sends 1 stream and receives $N - 1$ streams.
  - For **$N = 10$ participants**, each user receives 9 streams (~1.5–2.5 Mbps download, ~0.6 Mbps upload). Modern connections and laptops handle **10 participants smoothly**.
  - **Render SFU (Relay Mode)**: If media is relayed through a Render Starter container ($7/mo with a 100 Mbps network port), 10 participants streaming 720p consume $\approx 90\text{ Mbps}$, which hits the 100 Mbps limit.
* **Conclusion**: **10 participants per meeting is the ideal sweet spot** for Render hosting with WebRTC mesh. The room creator can set the exact cap (e.g. 10), and the backend strictly locks the door when the quota is reached.

---

## 5. Resend Email Setup & Verification

1. Get an API key from [resend.com](https://resend.com).
2. To test sending a confirmation email immediately to `erise.club@hns-re2sd.dz`, run:
   ```bash
   python deploy/test-resend.py
   # Or with explicit key:
   RESEND_API_KEY="re_your_key_here" python deploy/test-resend.py erise.club@hns-re2sd.dz
   ```
3. To enable Supabase Auth custom SMTP with Resend:
   - Go to Supabase Dashboard > **Project Settings > Authentication > SMTP Settings**.
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - User: `resend`
   - Pass: `re_your_api_key`
   - Sender Email: `onboarding@resend.dev` or your verified domain.

---

## 6. Firebase Hosting & Custom Domain Deployment

1. Install Firebase CLI (if not installed):
   ```bash
   npm install -g firebase-tools
   ```
2. In the `frontend/` directory, set production environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   VITE_SIGNALING_WS_URL=wss://erise-signaling-service.onrender.com/ws
   VITE_CORE_API_URL=https://erise-core-service.onrender.com/api
   ```
3. Build the frontend production bundle:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
4. Deploy to Firebase Hosting:
   ```bash
   firebase login
   firebase deploy --only hosting
   ```
5. **Add Your Custom Domain**:
   - Go to the [Firebase Console](https://console.firebase.google.com/) > **Hosting**.
   - Click **Add Custom Domain** (e.g. `meet.erise.dz` or `platform.erise-club.org`).
   - Enter your domain name and follow the verification instructions (adding the TXT and A records to your DNS provider).
   - Firebase automatically provisions free SSL certificates within 24 hours.

---

## 7. Local Development Quickstart

To run the full stack locally:

1. **Python Signaling Server**:
   ```bash
   cd backend-signaling-python
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
2. **Java Core API**:
   ```bash
   cd backend-core-java
   mvn spring-boot:run
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.
