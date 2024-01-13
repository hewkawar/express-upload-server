const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3301;
const databaseFilePath = path.join(__dirname, 'data', 'database.json');

// Load the database from file or create an empty one if it doesn't exist
let database = [];

const loadDatabase = async () => {
    try {
        const data = await fs.readFile(databaseFilePath, 'utf-8');
        database = JSON.parse(data);
    } catch (error) {
        console.log('Database not found. Creating a new one.');
        database = [];
    }
};

const saveDatabase = async () => {
    try {
        await fs.writeFile(databaseFilePath, JSON.stringify(database, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving database:', error);
    }
};

// Function to generate a random token
function generateRandomToken(length) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length, (err, buffer) => {
            if (err) {
                reject(err);
            } else {
                const token = buffer.toString('hex');
                resolve(token);
            }
        });
    });
}

// Middleware
app.use(cors());
app.use(express.json());

// Set up multer for handling file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Uploads will be stored in the 'uploads/' directory
    },
    filename: async (req, file, cb) => {
        const fileId = `${Date.now()}_${await generateRandomToken(8)}`; // Use time-based ID with random token
        const originalFileName = file.originalname;
        const filePath = path.join(__dirname, 'uploads', `${fileId}-${originalFileName}`);

        // Store file information in the database
        database.push({
            id: fileId,
            originalFileName: originalFileName,
            filePath: filePath,
        });

        console.log(`Save ${file.originalname}`);

        saveDatabase();

        cb(null, `${fileId}-${originalFileName}`);
    },
});

const upload = multer({ storage: storage });

// Set up a route for file uploads
app.post('/upload', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    // Create an array of download URLs
    const uploadUrls = req.files.map((file) => {
        const fileId = file.filename.split('-')[0]; // Extract time-based ID from the filename
        const downloadUrl = `http://localhost:${port}/download/${fileId}/${encodeURIComponent(file.originalname)}`;
        const previewUrl = `http://localhost:${port}/preview/${fileId}/${encodeURIComponent(file.originalname)}`;
        const deleteUrl = `http://localhost:${port}/delete/${fileId}/${encodeURIComponent(file.originalname)}`;
        return {
            url: {
                downloadUrl,
                previewUrl,
                deleteUrl,
            }
        };
    });

    res.json(uploadUrls);
});

// Set up a route for file downloads
app.get('/download/:id/:filename', (req, res) => {
    const fileId = req.params.id;
    const requestedFileName = req.params.filename;

    // Find file information in the database
    const fileInfo = database.find((file) => file.id === fileId);

    if (!fileInfo) {
        return res.status(404).json({ error: 'File not found.' });
    }

    const originalFileName = fileInfo.originalFileName;

    // Check if the requested file name matches the original file name
    if (encodeURIComponent(requestedFileName) !== encodeURIComponent(originalFileName)) {
        return res.status(400).json({ error: 'Invalid file name.' });
    }

    // Send the file for download with the original file name
    res.download(fileInfo.filePath, originalFileName, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({ error: 'Error downloading file.' });
        }
    });
});

// Set up a route for file previews
app.get('/preview/:id/:filename', (req, res) => {
    const fileId = req.params.id;
    const requestedFileName = req.params.filename;

    // Find file information in the database
    const fileInfo = database.find((file) => file.id === fileId);

    if (!fileInfo) {
        return res.status(404).json({ error: 'File not found.' });
    }

    const originalFileName = fileInfo.originalFileName;

    // Check if the requested file name matches the original file name
    if (encodeURIComponent(requestedFileName) !== encodeURIComponent(originalFileName)) {
        return res.status(400).json({ error: 'Invalid file name.' });
    }

    // You can customize the way you want to handle file previews, e.g., send a URL to a frontend for rendering the preview
    const previewUrl = `http://localhost:${port}/preview/${fileId}/${encodeURIComponent(originalFileName)}`;

    // Here, you might want to send the preview URL or render the preview directly, depending on your application's needs.
    res.sendFile(fileInfo.filePath);
});

// Set up a route for file deletion (without deleting the actual file)
app.delete('/delete/:id/:filename', (req, res) => {
    const fileId = req.params.id;
    const requestedFileName = req.params.filename;

    // Find file information in the database
    const fileIndex = database.findIndex((file) => file.id === fileId);

    if (fileIndex === -1) {
        return res.status(404).json({ error: 'File not found.' });
    }

    const originalFileName = database[fileIndex].originalFileName;

    // Check if the requested file name matches the original file name
    if (encodeURIComponent(requestedFileName) !== encodeURIComponent(originalFileName)) {
        return res.status(400).json({ error: 'Invalid file name.' });
    }

    // Remove the file information from the database
    const deletedFile = database.splice(fileIndex, 1)[0];
    saveDatabase();

    res.json({ message: 'File deleted successfully.' });
});


// Set up a route for the dashboard
app.get('/dashboard', (req, res) => {
    const dashboardData = {
        totalFiles: database.length,
        files: database.map(file => ({
            id: file.id,
            originalFileName: file.originalFileName,
            downloadUrl: `http://localhost:${port}/download/${file.id}/${encodeURIComponent(file.originalFileName)}`,
        })),
    };

    res.json(dashboardData);
});

// Load the database on server start
loadDatabase().then(() => {
    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
});
