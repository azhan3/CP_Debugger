// routes/graph.js

const express = require('express');
const router = express.Router();

// Define the route to render the Pug template
router.get('/', function(req, res, next) {
    res.render('graph'); // 'graph' is the name of your Pug template
});

module.exports = router;
