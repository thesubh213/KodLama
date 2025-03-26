const express = require('express');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userData = require('./data/users.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'someSecretKey',           // replace with secure random key in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }          // change to 'true' once you have HTTPS setup
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === userData.username && password === userData.password) {
        req.session.user = username;
        res.json({ success: true, message: 'Login Successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
});

// Logout route
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Middleware to verify login status
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.status(403).json({ message: 'Not authorized' });
};

// Protected route to check current user session status
app.get('/api/dashboard', isAuthenticated, (req, res) => {
    res.json({ message: 'Welcome to your dashboard', username: req.session.user });
});

// File upload route (protected)
app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    res.json({ uploadedFile: req.file.filename });
});

// Get a list of user's uploaded files (protected)
app.get('/api/files', isAuthenticated, (req, res) => {
    fs.readdir('./uploads', (err, files) => {
        if (err) return res.status(500).json({ message: 'Unable to read files' });
        res.json(files);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});