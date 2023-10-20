// routes/data.js

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { writeFile } = require('fs');

let storedPayload = null;

function openWebsite(url) {
    let command = '';

    // Detect the platform to choose the appropriate command
    if (process.platform === 'win32') {
        // Windows
        command = `start ${url}`;
    } else if (process.platform === 'darwin') {
        // macOS
        command = `open ${url}`;
    } else {
        // Linux or other Unix-based systems
        command = `xdg-open ${url}`;
    }

    // Execute the command to open the website
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error opening the website: ${error}`);
        }
    });
}
// Define a POST route to handle data
router.post('/', async function (req, res, next) {
    // Handle the POST request here
    console.log('Received POST request from libcurl');

    const payload = req.body;

    console.log('Request body:', payload[0]['content']);

    const jsonData = JSON.stringify(payload);

    // Store the payload in the variable
    storedPayload = jsonData;

    writeFile('storage.json', jsonData, (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file written successfully.');
        }
    });

    openWebsite('http://localhost:3000/graph');

    // Send a response (if needed)
    res.send('POST request received');
});

// Define a GET route to retrieve the stored payload
router.get('/get-payload', (req, res) => {
    if (storedPayload) {
        // Send the stored payload as the response
        res.json(JSON.parse(storedPayload));
    } else {
        res.status(404).send('No payload available.');
    }
});

module.exports = router;
