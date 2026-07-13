const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// TODO: mount feature routes under /api/v1 (auth, records, permits, reviews, newsletters, search, audit)
// TODO: mount errorHandler middleware last

module.exports = app;
