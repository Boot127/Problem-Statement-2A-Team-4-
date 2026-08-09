const path = require('path');
const express = require('express');
const cors = require('cors');
require('./config/db'); // opens the SQLite connection and ensures the schema exists

const authRoutes = require('./routes/authRoutes');
const recordRoutes = require('./routes/recordRoutes');
const searchRoutes = require('./routes/searchRoutes');
const auditRoutes = require('./routes/auditRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Serves uploaded source-document attachments (FR-1.5). Static files only —
// access control on *which* records/attachments exist is enforced by the
// /records API, not by this route.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/records', recordRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

// permitRoutes / reviewRoutes / newsletterRoutes belong to Developers 2-4
// and are intentionally not mounted yet — their route files remain the
// original TODO stubs.

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

module.exports = app;
