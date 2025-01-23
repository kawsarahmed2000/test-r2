const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudflare R2 Configuration
const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    requestHandler: new NodeHttpHandler({ connectionTimeout: 5000 }),  // Forces IPv4
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        console.log("Using R2 Endpoint:", process.env.R2_ENDPOINT);
        console.log("Using Bucket Name:", BUCKET_NAME);

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileName = `${crypto.randomUUID()}-${req.file.originalname}`;

        const uploadParams = {
            Bucket: BUCKET_NAME, // Fixed: Using environment variable instead of hardcoded 'k'
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        await r2Client.send(new PutObjectCommand(uploadParams));

        const fileUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`); // Removed 'kawsar' from the log message
});
