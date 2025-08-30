require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// PostgreSQL connection
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Connect to database
client.connect()
  .then(() => {
    console.log('Connected to Neon PostgreSQL database');
    
    // Create table if it doesn't exist
    return client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  })
  .then(() => {
    console.log('Employees table ready');
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

// Routes

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM employees ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET single employee
app.get('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST new employee
app.post('/api/employees', async (req, res) => {
  const { name, email, phone } = req.body;
  
  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  try {
    const result = await client.query(
      'INSERT INTO employees (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    
    res.status(201).json({
      ...result.rows[0],
      message: 'Employee created successfully'
    });
  } catch (err) {
    console.error('Error creating employee:', err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
});

// PUT update employee
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  
  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  try {
    const result = await client.query(
      'UPDATE employees SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING *',
      [name, email, phone, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error('Error updating employee:', err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update employee' });
    }
  }
});

// DELETE employee
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await client.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('GET /api/employees - Get all employees');
  console.log('GET /api/employees/:id - Get single employee');
  console.log('POST /api/employees - Create new employee');
  console.log('PUT /api/employees/:id - Update employee');
  console.log('DELETE /api/employees/:id - Delete employee');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  client.end()
    .then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error closing database connection:', err);
      process.exit(1);
    });
});