const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const app = express();
const port = 3000;

// MongoDB Connection
const mongoUrl = 'mongodb://localhost:27017/echowelldb';
const client = new MongoClient(mongoUrl);
let db;

async function connectToMongo() {
    try {
        await client.connect();
        db = client.db();
        console.log('Connected successfully to MongoDB');
    } catch (err) {
        console.error('Could not connect to MongoDB', err);
        process.exit(1);
    }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- HTML Page Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- API Routes ---

// Helper for password hashing
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, original) => {
    const [salt, originalHash] = original.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
};

// Register a new user
app.post('/register', async (req, res) => {
    const { name, email, password, age, collegeName, grades } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = hashPassword(password);
    await usersCollection.insertOne({
        name,
        email,
        password: hashedPassword,
        age,
        collegeName,
        grades
    });

    res.status(201).json({ message: 'User registered successfully.' });
});

// Login a user
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.collection('users').findOne({ email });

    if (user && verifyPassword(password, user.password)) {
        const mockToken = `mock-token-for-user-${user._id}`;
        res.json({ token: mockToken });
    } else {
        res.status(401).json({ message: 'Invalid email or password.' });
    }
});

// Get anonymous messages
app.get('/api/shares', async (req, res) => {
    const messages = await db.collection('messages').find().sort({ timestamp: -1 }).limit(100).toArray();
    res.json(messages);
});

// Post an anonymous message
app.post('/api/shares', async (req, res) => {
    const { message } = req.body;
    if (message) {
        const newMessage = { text: message, timestamp: new Date() };
        await db.collection('messages').insertOne(newMessage);
        res.status(201).json(newMessage);
    } else {
        res.status(400).send('Message is required');
    }
});

// Start the server after connecting to the database
connectToMongo().then(() => {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
});