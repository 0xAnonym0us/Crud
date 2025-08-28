const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin', // Replace with your actual MySQL root password
    database: 'employee_db'
});

// Test database connection
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Routes

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// GET all employees
app.get('/api/employees', (req, res) => {
    const query = 'SELECT * FROM employees ORDER BY id DESC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching employees:', err);
            res.status(500).json({ error: 'Failed to fetch employees' });
            return;
        }
        res.json(results);
    });
});

// GET single employee
app.get('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM employees WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching employee:', err);
            res.status(500).json({ error: 'Failed to fetch employee' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        
        res.json(results[0]);
    });
});

// POST new employee
app.post('/api/employees', (req, res) => {
    const { name, email, phone } = req.body;
    
    // Basic validation
    if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required' });
        return;
    }
    
    const query = 'INSERT INTO employees (name, email, phone) VALUES (?, ?, ?)';
    
    db.query(query, [name, email, phone], (err, results) => {
        if (err) {
            console.error('Error creating employee:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ error: 'Email already exists' });
            } else {
                res.status(500).json({ error: 'Failed to create employee' });
            }
            return;
        }
        
        res.status(201).json({ 
            id: results.insertId, 
            name, 
            email, 
            phone,
            message: 'Employee created successfully' 
        });
    });
});

// PUT update employee
app.put('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    
    // Basic validation
    if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required' });
        return;
    }
    
    const query = 'UPDATE employees SET name = ?, email = ?, phone = ? WHERE id = ?';
    
    db.query(query, [name, email, phone, id], (err, results) => {
        if (err) {
            console.error('Error updating employee:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ error: 'Email already exists' });
            } else {
                res.status(500).json({ error: 'Failed to update employee' });
            }
            return;
        }
        
        if (results.affectedRows === 0) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        
        res.json({ message: 'Employee updated successfully' });
    });
});

// DELETE employee
app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM employees WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error deleting employee:', err);
            res.status(500).json({ error: 'Failed to delete employee' });
            return;
        }
        
        if (results.affectedRows === 0) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        
        res.json({ message: 'Employee deleted successfully' });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('GET    /api/employees      - Get all employees');
    console.log('GET    /api/employees/:id  - Get single employee');
    console.log('POST   /api/employees      - Create new employee');
    console.log('PUT    /api/employees/:id  - Update employee');
    console.log('DELETE /api/employees/:id  - Delete employee');
});