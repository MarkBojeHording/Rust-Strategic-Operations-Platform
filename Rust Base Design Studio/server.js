const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const { initializeDatabase } = require('./server/db.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));
app.use('/attached_assets', express.static('attached_assets'));

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err);
    } else {
        console.log('✅ Database connected successfully');
        release();
    }
});

// Routes

// Save map to database
app.post('/api/maps', async (req, res) => {
    try {
        const { name, mapData } = req.body;
        
        if (!name || !mapData) {
            return res.status(400).json({ error: 'Name and map data are required' });
        }

        const query = `
            INSERT INTO maps (name, map_data, created_at, updated_at) 
            VALUES ($1, $2, NOW(), NOW()) 
            RETURNING id, name, created_at
        `;
        
        const result = await pool.query(query, [name, JSON.stringify(mapData)]);
        
        res.json({
            success: true,
            map: result.rows[0],
            message: 'Map saved successfully!'
        });
    } catch (error) {
        console.error('Error saving map:', error);
        res.status(500).json({ error: 'Failed to save map' });
    }
});

// Get all maps
app.get('/api/maps', async (req, res) => {
    try {
        const query = 'SELECT id, name, created_at, updated_at FROM maps ORDER BY updated_at DESC';
        const result = await pool.query(query);
        
        res.json({
            success: true,
            maps: result.rows
        });
    } catch (error) {
        console.error('Error fetching maps:', error);
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

// Get specific map
app.get('/api/maps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM maps WHERE id = $1';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        res.json({
            success: true,
            map: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching map:', error);
        res.status(500).json({ error: 'Failed to fetch map' });
    }
});

// Delete map
app.delete('/api/maps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM maps WHERE id = $1 RETURNING id, name';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        res.json({
            success: true,
            message: 'Map deleted successfully',
            map: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting map:', error);
        res.status(500).json({ error: 'Failed to delete map' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT}`);
    await initializeDatabase();
});