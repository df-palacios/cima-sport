require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const serviceRoutes = require('./routes/services');
const deliveryRoutes = require('./routes/deliveries');
const testingRoutes = require('./routes/testing');
const teamRoutes = require('./routes/team');
const cashRoutes = require('./routes/cash');

const app = express();

// CORS: igual patrón que en otros proyectos — se permite siempre la red
// local, para poder probar desde el celular sin tocar configuración.
const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',').map((o) => o.trim()).filter(Boolean);
const ES_RED_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes('*')) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    if (ES_RED_LOCAL.test(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'cima-sport-api' }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/testing', testingRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/cash', cashRoutes);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`✔ API de CIMA SPORT corriendo en http://localhost:${PORT}`));
