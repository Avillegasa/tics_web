const { query } = require('../database/hybrid-init');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');

// Validation rules for user registration
const userValidationRules = () => {
    return [
        body('username')
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
        body('first_name')
            .isLength({ min: 1, max: 50 })
            .withMessage('First name is required and must be less than 50 characters'),
        body('last_name')
            .isLength({ min: 1, max: 50 })
            .withMessage('Last name is required and must be less than 50 characters'),
        body('role')
            .optional()
            .isIn(['customer', 'admin'])
            .withMessage('Role must be either customer or admin'),
        body('phone')
            .optional()
            .isMobilePhone()
            .withMessage('Please provide a valid phone number'),
        body('city')
            .optional()
            .isLength({ max: 50 })
            .withMessage('City must be less than 50 characters'),
        body('postal_code')
            .optional()
            .isLength({ max: 10 })
            .withMessage('Postal code must be less than 10 characters'),
        body('country')
            .optional()
            .isLength({ max: 50 })
            .withMessage('Country must be less than 50 characters')
    ];
};

// Validation rules for user updates
const updateValidationRules = () => {
    return [
        body('username')
            .optional()
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .optional()
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
        body('first_name')
            .optional()
            .isLength({ min: 1, max: 50 })
            .withMessage('First name must be less than 50 characters'),
        body('last_name')
            .optional()
            .isLength({ min: 1, max: 50 })
            .withMessage('Last name must be less than 50 characters'),
        body('role')
            .optional()
            .isIn(['customer', 'admin'])
            .withMessage('Role must be either customer or admin'),
        body('phone')
            .optional()
            .isMobilePhone()
            .withMessage('Please provide a valid phone number'),
        body('city')
            .optional()
            .isLength({ max: 50 })
            .withMessage('City must be less than 50 characters'),
        body('postal_code')
            .optional()
            .isLength({ max: 10 })
            .withMessage('Postal code must be less than 10 characters'),
        body('country')
            .optional()
            .isLength({ max: 50 })
            .withMessage('Country must be less than 50 characters')
    ];
};

// Register new user
const registerUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            username,
            email,
            password,
            first_name,
            last_name,
            role = 'customer',
            phone,
            address,
            city,
            postal_code,
            country
        } = req.body;

        // Check if user already exists
        const existingUserQuery = `
            SELECT id FROM users
            WHERE username = $1 OR email = $2
        `;
        const existingUser = await query(existingUserQuery, [username, email]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const insertUserQuery = `
            INSERT INTO users (
                username, email, password, first_name, last_name, role,
                phone, address, city, postal_code, country
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, username, email, first_name, last_name, role, created_at
        `;

        const params = [
            username, email, hashedPassword, first_name, last_name, role,
            phone, address, city, postal_code, country
        ];

        const result = await query(insertUserQuery, params);
        const newUser = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: newUser.id,
                username: newUser.username,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role,
                created_at: newUser.created_at
            },
            token
        });

    } catch (error) {
        console.error('Error in registerUser:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Login user
const loginUser = async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username/email and password are required'
            });
        }

        // Find user by username or email
        const userQuery = `
            SELECT * FROM users
            WHERE (username = $1 OR email = $1) AND is_active = true
        `;
        const result = await query(userQuery, [login]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const user = result.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Error in loginUser:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        const userQuery = `
            SELECT id, username, email, first_name, last_name, role, phone,
                   address, city, postal_code, country, created_at
            FROM users
            WHERE id = $1 AND is_active = true
        `;
        const result = await query(userQuery, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, role } = req.query;
        const offset = (page - 1) * limit;

        let countQuery = `SELECT COUNT(*) FROM users WHERE is_active = true`;
        let userQuery = `
            SELECT id, username, email, first_name, last_name, role, phone,
                   city, country, created_at, updated_at
            FROM users
            WHERE is_active = true
        `;

        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            const searchCondition = ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
            countQuery += searchCondition;
            userQuery += searchCondition;
            params.push(`%${search}%`);
        }

        if (role) {
            paramCount++;
            const roleCondition = ` AND role = $${paramCount}`;
            countQuery += roleCondition;
            userQuery += roleCondition;
            params.push(role);
        }

        userQuery += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);

        const [countResult, usersResult] = await Promise.all([
            query(countQuery, params.slice(0, paramCount)),
            query(userQuery, params)
        ]);

        const totalUsers = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalUsers / limit);

        res.json({
            success: true,
            users: usersResult.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalUsers,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const userQuery = `
            SELECT id, username, email, first_name, last_name, role, phone,
                   address, city, postal_code, country, created_at, updated_at
            FROM users
            WHERE id = $1 AND is_active = true
        `;
        const result = await query(userQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error in getUserById:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const {
            username,
            email,
            password,
            first_name,
            last_name,
            role,
            phone,
            address,
            city,
            postal_code,
            country
        } = req.body;

        // Check if user exists
        const existingUserQuery = `SELECT id FROM users WHERE id = $1 AND is_active = true`;
        const existingUser = await query(existingUserQuery, [id]);

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check for username/email conflicts
        if (username || email) {
            const conflictQuery = `
                SELECT id FROM users
                WHERE (username = $1 OR email = $2) AND id != $3 AND is_active = true
            `;
            const conflict = await query(conflictQuery, [username || '', email || '', id]);

            if (conflict.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Username or email already exists'
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramCount = 0;

        if (username) {
            paramCount++;
            updates.push(`username = $${paramCount}`);
            params.push(username);
        }

        if (email) {
            paramCount++;
            updates.push(`email = $${paramCount}`);
            params.push(email);
        }

        if (password) {
            paramCount++;
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(`password = $${paramCount}`);
            params.push(hashedPassword);
        }

        if (first_name) {
            paramCount++;
            updates.push(`first_name = $${paramCount}`);
            params.push(first_name);
        }

        if (last_name) {
            paramCount++;
            updates.push(`last_name = $${paramCount}`);
            params.push(last_name);
        }

        if (role) {
            paramCount++;
            updates.push(`role = $${paramCount}`);
            params.push(role);
        }

        if (phone !== undefined) {
            paramCount++;
            updates.push(`phone = $${paramCount}`);
            params.push(phone);
        }

        if (address !== undefined) {
            paramCount++;
            updates.push(`address = $${paramCount}`);
            params.push(address);
        }

        if (city !== undefined) {
            paramCount++;
            updates.push(`city = $${paramCount}`);
            params.push(city);
        }

        if (postal_code !== undefined) {
            paramCount++;
            updates.push(`postal_code = $${paramCount}`);
            params.push(postal_code);
        }

        if (country !== undefined) {
            paramCount++;
            updates.push(`country = $${paramCount}`);
            params.push(country);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        paramCount++;
        params.push(id);

        const updateQuery = `
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id = $${paramCount} AND is_active = true
            RETURNING id, username, email, first_name, last_name, role
        `;

        const result = await query(updateQuery, params);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error in updateUser:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Delete user (soft delete)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const deleteQuery = `
            UPDATE users
            SET is_active = false
            WHERE id = $1 AND is_active = true
            RETURNING id
        `;
        const result = await query(deleteQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    userValidationRules,
    updateValidationRules,
    registerUser,
    loginUser,
    getCurrentUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};