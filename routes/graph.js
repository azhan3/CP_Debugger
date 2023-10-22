// routes/graph.js

const express = require('express');
const {query} = require("express/lib/request");
const router = express.Router();
const axios = require('axios');

router.get('/', function(req, res, next) {

    const url = 'http://localhost:3000/data/cnt';
    axios.get(url)
        .then(response => {
            console.log('GET request successful');
            console.log('Response data:', response.data["ret"]);

            const pages = response.data["ret"].length

            res.render('ui', { "pages": pages, "subLists": response.data["ret"] });

        })
        .catch(error => {
            console.error('Error sending GET request:', error);
            return res.status(400).send('Invalid');
        });

});

module.exports = router;
