const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
    maxAge: 86400 // 24 hours
}));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.use(express.json());
app.use(express.static('public'));

// Add a test route to verify server is running
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.id });
        
        if (!user) {
            throw new Error();
        }
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Routes
// Register
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = new User({ username, email, password });
        await user.save();
        
        // Generate token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Send response
        res.status(201).json({ 
            message: 'Registration successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Send response
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get User Progress
app.get('/api/progress', auth, async (req, res) => {
    try {
        res.json(req.user.progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Path Progress
app.post('/api/progress/path', auth, async (req, res) => {
    try {
        const { pathId, topicId, completed } = req.body;
        const user = req.user;
        
        // Update path progress
        const path = user.progress.paths[pathId];
        if (topicId) {
            const topic = path.topics.find(t => t.name === topicId);
            if (topic) {
                topic.completed = completed;
            }
        }
        
        // Calculate overall progress
        const totalTopics = path.topics.length;
        const completedTopics = path.topics.filter(t => t.completed).length;
        path.progress = (completedTopics / totalTopics) * 100;
        path.completed = path.progress === 100;
        
        await user.save();
        res.json(user.progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Tutorial Progress
app.post('/api/progress/tutorial', auth, async (req, res) => {
    try {
        const { tutorialId, step } = req.body;
        const user = req.user;
        
        const tutorial = user.progress.tutorials[tutorialId];
        tutorial.currentStep = step;
        tutorial.completed = step >= 3; // Assuming 3 steps per tutorial
        
        await user.save();
        res.json(user.progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Challenge Progress
app.post('/api/progress/challenge', auth, async (req, res) => {
    try {
        const { challengeId, completed, points } = req.body;
        const user = req.user;
        
        const challenge = user.progress.challenges[challengeId];
        challenge.completed = completed;
        challenge.points = points;
        
        // Update total points and rank
        user.progress.totalPoints = Object.values(user.progress.challenges)
            .reduce((total, c) => total + c.points, 0);
        user.updateRank();
        
        await user.save();
        res.json(user.progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find()
            .select('username progress.totalPoints progress.rank')
            .sort({ 'progress.totalPoints': -1 })
            .limit(10);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

