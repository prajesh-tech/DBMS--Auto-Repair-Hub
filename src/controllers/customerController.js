const db = require('../config/database');

const getCustomers = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM Customer WHERE is_deleted = FALSE';
        let countQuery = 'SELECT COUNT(*) as total FROM Customer WHERE is_deleted = FALSE';
        let queryParams = [];

        if (search) {
            query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const term = `%${search}%`;
            queryParams = [term, term, term];
        }

        query += ' ORDER BY customer_id DESC LIMIT ? OFFSET ?';

        const [rows] = await db.query(query, [...queryParams, limit, offset]);
        const [countResult] = await db.query(countQuery, queryParams);

        const total = countResult[0].total;

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};

const getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM Customer WHERE customer_id = ? AND is_deleted = FALSE', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const { name, phone, email } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and Phone are required' });
        }

        const [result] = await db.query(
            'INSERT INTO Customer (name, phone, email) VALUES (?, ?, ?)',
            [name, phone, email || null]
        );

        res.status(201).json({
            success: true,
            message: 'Customer added successfully',
            customerId: result.insertId
        });
    } catch (err) {
        next(err);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, email } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and Phone are required' });
        }

        const [result] = await db.query(
            'UPDATE Customer SET name = ?, phone = ?, email = ? WHERE customer_id = ? AND is_deleted = FALSE',
            [name, phone, email || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, message: 'Customer updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Soft Delete
        const [result] = await db.query('UPDATE Customer SET is_deleted = TRUE WHERE customer_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};
