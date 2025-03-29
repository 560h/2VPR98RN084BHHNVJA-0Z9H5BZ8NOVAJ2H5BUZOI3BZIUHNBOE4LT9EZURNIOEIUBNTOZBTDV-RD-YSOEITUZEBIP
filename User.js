const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    progress: {
        paths: {
            beginner: {
                completed: { type: Boolean, default: false },
                progress: { type: Number, default: 0 },
                topics: [{
                    name: String,
                    completed: Boolean
                }]
            },
            webSecurity: {
                completed: { type: Boolean, default: false },
                progress: { type: Number, default: 0 },
                topics: [{
                    name: String,
                    completed: Boolean
                }]
            },
            networkSecurity: {
                completed: { type: Boolean, default: false },
                progress: { type: Number, default: 0 },
                topics: [{
                    name: String,
                    completed: Boolean
                }]
            }
        },
        tutorials: {
            commandLine: {
                completed: { type: Boolean, default: false },
                currentStep: { type: Number, default: 0 }
            },
            python: {
                completed: { type: Boolean, default: false },
                currentStep: { type: Number, default: 0 }
            },
            cryptography: {
                completed: { type: Boolean, default: false },
                currentStep: { type: Number, default: 0 }
            }
        },
        challenges: {
            passwordCracking: {
                completed: { type: Boolean, default: false },
                points: { type: Number, default: 0 }
            },
            webExploitation: {
                completed: { type: Boolean, default: false },
                points: { type: Number, default: 0 }
            },
            reverseEngineering: {
                completed: { type: Boolean, default: false },
                points: { type: Number, default: 0 }
            }
        },
        totalPoints: { type: Number, default: 0 },
        rank: { type: String, default: 'Beginner' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Update rank based on points
userSchema.methods.updateRank = function() {
    if (this.progress.totalPoints >= 1000) this.progress.rank = 'Master';
    else if (this.progress.totalPoints >= 500) this.progress.rank = 'Expert';
    else if (this.progress.totalPoints >= 250) this.progress.rank = 'Advanced';
    else if (this.progress.totalPoints >= 100) this.progress.rank = 'Intermediate';
    else this.progress.rank = 'Beginner';
};

module.exports = mongoose.model('User', userSchema); 
