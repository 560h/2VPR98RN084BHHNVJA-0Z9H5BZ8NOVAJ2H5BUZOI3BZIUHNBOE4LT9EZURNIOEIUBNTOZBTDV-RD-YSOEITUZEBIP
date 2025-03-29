const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Log environment variables (without sensitive data)
console.log('Environment check:', {
    port: process.env.PORT,
    mongoUri: process.env.MONGODB_URI ? 'MongoDB URI is set' : 'MongoDB URI is missing',
    jwtSecret: process.env.JWT_SECRET ? 'JWT Secret is set' : 'JWT Secret is missing'
});

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.static('public'));

// Test route to verify server is running
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Server is running!' });
});

// MongoDB connection with detailed logging
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        console.log('Database name:', mongoose.connection.db.databaseName);
        console.log('Host:', mongoose.connection.host);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.error('Connection string:', process.env.MONGODB_URI.replace(/:[^@]+@/, ':****@'));
    });

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
    console.log('Registration request received');
    console.log('Request body:', { ...req.body, password: '****' });
    
    try {
        const { username, email, password } = req.body;
        console.log('Registration data:', { username, email });
        
        // Validate input
        if (!username || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists with detailed logging
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Registration failed: Email already exists');
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create user with detailed logging
        console.log('Creating new user');
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role: 'user'
        });

        await user.save();
        console.log('User created successfully');

        // Generate token with detailed logging
        console.log('Generating JWT token');
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('Token generated successfully');

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server URL: https://cybersecurity-qasu.onrender.com`);
});

