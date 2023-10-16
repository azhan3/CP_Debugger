// routes/graph.js

const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    res.render('ui');

});

module.exports = router;
