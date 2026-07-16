const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const permitRoutes = require('./routes/permitRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

// Only Work Permit Management (Dev 2) is wired up so far. The other feature
// routes (auth, records, reviews, newsletters, search, audit) are TODO for
// their respective owners — see routes/*.js.
app.use('/api/v1/permits', permitRoutes);

// Add new feature route mounts (auth, records, reviews, newsletters, search,
// audit) ABOVE this line. errorHandler must stay the LAST app.use() call —
// Express only routes errors to handlers registered after the route that
// threw, so anything mounted below it will not have its errors caught.
app.use(errorHandler);

module.exports = app;
