const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
require('./config/db'); // opens the shared SQLite connection and ensures its schema exists

const authRoutes = require('./routes/authRoutes');
const recordRoutes = require('./routes/recordRoutes');
const searchRoutes = require('./routes/searchRoutes');
const auditRoutes = require('./routes/auditRoutes');
const permitRoutes = require('./routes/permitRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewController = require('./controllers/reviewController');
const newsletterRoutes = require('./routes/newsletterRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.clientOrigin }));
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
app.use('/api/v1/permits', permitRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.get('/api/v1/notifications', reviewController.notifications);
app.use('/api/v1/newsletters', newsletterRoutes);
app.use('/uploads/newsletters', express.static(path.join(__dirname, '..', 'uploads', 'newsletters')));
app.use('/api/v1/admin', adminRoutes);

// Add new feature route mounts ABOVE this line. errorHandler
// must stay the LAST app.use() call — Express only routes errors to
// handlers registered after the route that threw, so anything mounted below
// it will not have its errors caught.

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

module.exports = app;
