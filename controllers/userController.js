const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');

// Validation rules
const userValidationRules = () => {
    return [
        body('username').isLength({ min: 3, max: 50 }).trim().escape(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('first_name').isLength({ min: 1, max: 50 }).trim().escape(),
        body('last_name').isLength({ min: 1, max: 50 }).trim().escape(),
        body('phone').optional().isMobilePhone(),
        body('role').optional().isIn(['customer', 'admin'])
    ];
};

const updateValidationRules = () => {
    return [
        body('username').optional().isLength({ min: 3, max: 50 }).trim().escape(),
        body('email').optional().isEmail().normalizeEmail(),
        body('first_name').optional().isLength({ min: 1, max: 50 }).trim().escape(),
        body('last_name').optional().isLength({ min: 1, max: 50 }).trim().escape(),
        body('phone').optional().isMobilePhone(),
        body('role').optional().isIn(['customer', 'admin'])
    ];
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Register new user
const registerUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, first_name, last_name, phone, address, city, postal_code, country } = req.body;

        // Check if user already exists
        const checkUser = `SELECT id FROM users WHERE username = ? OR email = ?`;

        db.get(checkUser, [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertUser = `INSERT INTO users (
                username, email, password, first_name, last_name, phone, address, city, postal_code, country
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(insertUser, [
                username, email, hashedPassword, first_name, last_name, phone, address, city, postal_code, country
            ], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                // Get the created user
                const getUser = `SELECT id, username, email, first_name, last_name, role, created_at FROM users WHERE id = ?`;

                db.get(getUser, [this.lastID], (err, user) => {
                    if (err) {
                        return res.status(500).json({ error: 'User created but failed to retrieve' });
                    }

                    const token = generateToken(user);
                    res.status(201).json({
                        message: 'User created successfully',
                        user: user,
                        token: token
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Login user
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const getUser = `SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1`;

        db.get(getUser, [username, username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate token
            const token = generateToken(user);

            // Remove password from response
            delete user.password;

            res.json({
                message: 'Login successful',
                user: user,
                token: token
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all users (admin only)
const getAllUsers = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM users`;
    const getUsersQuery = `SELECT id, username, email, first_name, last_name, role, phone, city, country, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    db.get(countQuery, [], (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        db.all(getUsersQuery, [limit, offset], (err, users) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                users: users,
                pagination: {
                    page: page,
                    limit: limit,
                    total: countResult.total,
                    pages: Math.ceil(countResult.total / limit)
                }
            });
        });
    });
};

// Get user by ID
const getUserById = (req, res) => {
    const userId = req.params.id;
    const getUser = `SELECT id, username, email, first_name, last_name, role, phone, address, city, postal_code, country, is_active, created_at FROM users WHERE id = ?`;

    db.get(getUser, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user });
    });
};

// Update user
const updateUser = (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const updates = req.body;

        // Remove password from updates if empty
        if (updates.password && updates.password.trim() === '') {
            delete updates.password;
        }

        // Build dynamic update query
        const allowedFields = ['username', 'email', 'first_name', 'last_name', 'phone', 'address', 'city', 'postal_code', 'country', 'role', 'is_active'];
        const updateFields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Add updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

        // If password is being updated, hash it first
        if (updates.password) {
            bcrypt.hash(updates.password, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ error: 'Password hashing failed' });
                }

                // Replace password in values array
                const passwordIndex = Object.keys(updates).indexOf('password');
                if (passwordIndex !== -1) {
                    values[passwordIndex] = hashedPassword;
                }

                executeUpdate();
            });
        } else {
            executeUpdate();
        }

        function executeUpdate() {
            db.run(updateQuery, values, function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Failed to update user' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Get updated user
                const getUser = `SELECT id, username, email, first_name, last_name, role, phone, address, city, postal_code, country, is_active, updated_at FROM users WHERE id = ?`;

                db.get(getUser, [userId], (err, user) => {
                    if (err) {
                        return res.status(500).json({ error: 'User updated but failed to retrieve' });
                    }

                    res.json({
                        message: 'User updated successfully',
                        user: user
                    });
                });
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete user (soft delete)
const deleteUser = (req, res) => {
    const userId = req.params.id;

    // Check if user exists
    const checkUser = `SELECT id FROM users WHERE id = ?`;

    db.get(checkUser, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Soft delete by setting is_active to 0
        const deleteQuery = `UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        db.run(deleteQuery, [userId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete user' });
            }

            res.json({ message: 'User deleted successfully' });
        });
    });
};

// Get current user profile
const getCurrentUser = (req, res) => {
    const userId = req.user.id;
    const getUser = `SELECT id, username, email, first_name, last_name, role, phone, address, city, postal_code, country, created_at FROM users WHERE id = ?`;

    db.get(getUser, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user });
    });
};

module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getCurrentUser,
    userValidationRules,
    updateValidationRules
};