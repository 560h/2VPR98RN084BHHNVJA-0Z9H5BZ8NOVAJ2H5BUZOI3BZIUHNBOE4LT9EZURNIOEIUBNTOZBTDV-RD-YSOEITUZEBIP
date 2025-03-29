const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await user.comparePassword(password))) {
            throw new Error('Invalid login credentials');
        }
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ user, token });
    } catch (error) {
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
