# WeChat (WeChat-Inspired Social Messaging Web Application)

A premium, modern full-stack social messaging platform designed after WeChat, featuring real-time chats (one-to-one and groups), a WeChat Moments feed wall, QR Code generation and image-scanning, user profile configurations, and real-time notifications.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js (Vite template)
- **Routing**: React Router DOM (v6)
- **API Client**: Axios
- **State Management**: Context API
- **Styling**: Tailwind CSS v3 (Custom premium Burgundy theme)
- **Real-Time Client**: Socket.IO Client
- **QR Code Scanning**: HTML5 QR Code

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **ORM**: Sequelize ORM
- **Database**: MySQL (local port 3306)
- **Authentication**: JWT & bcryptjs
- **Media Uploads**: Multer
- **Real-Time Server**: Socket.IO
- **QR Code Generation**: node-qrcode

---

## ⚙️ Setup and Installation

### 1. Database Configuration
Before launching, make sure your local MySQL server is running on port `3306`.
- **Database Name**: `wechat_db`
- **Username**: `root`
- **Password**: `your_mysql_password`

*Note: The backend is programmed to automatically attempt to create the `wechat_db` database on startup if it does not already exist, followed by table syncing.*

### 2. Backend Setup
Navigate into the `backend/` directory, configure the environment variables, install dependencies, and seed:

```bash
# Navigate to backend
cd backend

# Install dependencies (bcryptjs, express, sequelize, mysql2, socket.io, qrcode, multer)
npm install

# Run database seed script (this truncates and populates sample users, DMs, posts, and group chats)
node database/seed.js

# Start backend server in development mode
npm run dev
```

The backend server will launch on [http://localhost:5000](http://localhost:5000) and print:
- `Database Connected Successfully`
- `Sequelize models synchronized successfully.`
- `Server running on port 5000`

### 3. Frontend Setup
Navigate into the `frontend/` directory, install packages, and launch:

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies (ignoring React 19 peer-dependency warnings)
npm install --legacy-peer-deps

# Start Vite hot-reload dev server
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 👥 Seed Accounts for Testing
The seed script (`node database/seed.js`) hashes and loads the following accounts with the password **`password123`**:

1. **Alice Smith** (`alice@wechat.com`)
2. **Bob Johnson** (`bob@wechat.com`)
3. **Charlie Brown** (`charlie@wechat.com`)
4. **David Miller** (`david@wechat.com`)
5. **Eve Wilson** (`eve@wechat.com`)

---

## 📡 REST API Documentation

### 🔒 Authentication (`/api/auth`)
- `POST /register`: Registers a new user, auto-generates a unique scannable QR Code containing `{userId, email, name}`, and registers it in database.
- `POST /login`: Validates password and returns a 30d JWT token and user details.
- `GET /me`: *(Protected)* Fetches profile info of current authenticated session.
- `PUT /password`: *(Protected)* Validates current password and updates to a new password.

### 👤 Users Profile (`/api/users`)
- `PUT /profile`: *(Protected)* Edit name, bio, email, and upload a profile picture (`profileImage` via Multer). Automatically regenerates the QR Code if name or email changes.
- `GET /search?query=<text>`: *(Protected)* Searches for platform users by name or email.
- `GET /stats`: *(Protected)* Returns current user stats (friendCount, postCount).
- `GET /stats/:userId`: *(Protected)* Returns target user stats.

### 🤝 Friend Management (`/api/friends`)
- `GET /`: *(Protected)* Lists active (accepted) friends.
- `GET /requests`: *(Protected)* Lists incoming pending friend requests.
- `POST /request`: *(Protected)* Sends a friend request. If a reciprocal request exists, automatically accepts it.
- `POST /accept`: *(Protected)* Accepts a friend request, changing status to `accepted`.
- `POST /reject`: *(Protected)* Rejects a friend request.
- `POST /cancel`: *(Protected)* Cancels a sent pending friend request.
- `POST /remove`: *(Protected)* Removes a friend.
- `GET /suggestions`: *(Protected)* Lists suggested users (users not currently friends and with no pending requests).

### 💬 Direct Messaging (`/api/chats`)
- `GET /messages/:receiverId`: *(Protected)* Retrieves DM history. Automatically marks unread received messages as seen.
- `POST /message`: *(Protected)* Sends a direct text message or files (`file` Multer attachment).
- `PUT /message/:messageId`: *(Protected)* Edits a text message sent by the user.
- `DELETE /message/:messageId`: *(Protected)* Deletes a message.
- `GET /messages/:receiverId/search?query=<text>`: *(Protected)* Searches keywords within DM chat log.

### 👥 Group Chats (`/api/groups`)
- `POST /`: *(Protected)* Creates a group chat. Supports naming, members list selection, and group picture upload.
- `GET /`: *(Protected)* Lists all groups joined by the user.
- `GET /:groupId`: *(Protected)* Fetches group metadata (members profile lists, admin name).
- `POST /members`: *(Protected)* Adds new members to the group.
- `POST /members/remove`: *(Protected)* Removes a member (Admins can remove anyone; members can leave themselves).
- `GET /:groupId/messages`: *(Protected)* Fetches group chat history.
- `POST /message`: *(Protected)* Sends a group message or group file attachment.

### 📸 WeChat Moments Feed (`/api/posts`)
- `POST /`: *(Protected)* Creates a Moments post. Supports text content and multiple images upload (up to 9).
- `PUT /:postId`: *(Protected)* Edits a post.
- `DELETE /:postId`: *(Protected)* Deletes a post and prunes related comments and likes.
- `POST /:postId/like`: *(Protected)* Toggles liking/unliking a moments post.
- `POST /:postId/comment`: *(Protected)* Posts a comment on a moments post.
- `DELETE /comment/:commentId`: *(Protected)* Deletes a comment.
- `GET /feed`: *(Protected)* Personalized feed of posts made by accepted friends + user's own posts (sorted by date descending).
- `GET /user/:userId`: *(Protected)* Retreives posts made by a specific user.
- `GET /trending`: *(Protected)* Returns recent popular posts.

### 🔔 Notifications (`/api/notifications`)
- `GET /`: *(Protected)* Lists notifications (likes, comments, requests, group invites).
- `PUT /:notificationId/read`: *(Protected)* Marks a notification as read.
- `PUT /read-all`: *(Protected)* Marks all user notifications as read.
- `DELETE /:notificationId`: *(Protected)* Deletes a notification.

---

## ⚡ Socket.IO Real-Time Events

### 1. Connection Presence
- Client emits `'register'` with `userId` on successful connection.
- Server maintains an active sockets mapping and broadcasts `'user_status'` (`online`/`offline`) to notify friends.

### 2. Typing Indicators
- Client emits `'typing'` or `'group_typing'` on input keypress.
- Server forwards event to target user or group room room to animate typing states.

### 3. Messaging
- Server emits `'new_message'` or `'new_group_message'` directly to target client sockets or group rooms (`group_<groupId>`) upon successful database logging, resulting in zero-lag real-time messages.

### 4. Read Receipts
- Client emits `'message_read'` when a chat box is opened.
- Server updates seen status and notifies sender socket to render checkmark completions.

---

## 🎨 Theme & UI/UX Styling Details
- **Burgundy Accent**: The primary Burgundy theme (`#800020`) is used for active states, indicators, action buttons, and header bars.
- **Charcoal Dark Grey**: Charcoal backgrounds (`#1E1E1E` and `#121212`) are utilized to create a gorgeous dark mode depth.
- **Glassmorphism panels**: Form containers, profile cards, scanner widgets, and search inputs are decorated with `glass-panel` and `glass-card` classes applying blur and subtle transparent white borders.
- **Animations**: Bubbles slide upwards, profile cards scale, and like heart buttons scale up. Custom bouncing typing indicator dots are built with CSS keyframes.
- **QR scan mock panel**: Added a fallback simulator panel to test QR-scan friend request routing instantly on devices lacking a camera or secure HTTPS webcam permissions.
