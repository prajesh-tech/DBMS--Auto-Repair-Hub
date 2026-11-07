const db = require('../config/database');

const parseId = (id) => {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const getCustomers = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
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

        const total = countResult && countResult[0] ? countResult[0].total : 0;

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
    } catch (err) {
        next(err);
    }
};

const getCustomerById = async (req, res, next) => {
    try {
        const customerId = parseId(req.params.id);
        if (!customerId) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID parameter' });
        }

        const [rows] = await db.query('SELECT * FROM Customer WHERE customer_id = ? AND is_deleted = FALSE', [customerId]);

        if (!rows || rows.length === 0) {
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

        if (!name || typeof name !== 'string' || !name.trim() || !phone || typeof phone !== 'string' || !phone.trim()) {
            return res.status(400).json({ success: false, message: 'Name and Phone are required strings' });
        }

        const cleanName = name.trim();
        const cleanPhone = phone.trim();
        const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim() : null;

        const [result] = await db.query(
            'INSERT INTO Customer (name, phone, email) VALUES (?, ?, ?)',
            [cleanName, cleanPhone, cleanEmail]
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
        const customerId = parseId(req.params.id);
        if (!customerId) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID parameter' });
        }

        const { name, phone, email } = req.body;

        if (name === undefined && phone === undefined && email === undefined) {
            return res.status(400).json({ success: false, message: 'No valid update fields provided' });
        }

        const cleanName = name !== undefined && typeof name === 'string' ? name.trim() : null;
        const cleanPhone = phone !== undefined && typeof phone === 'string' ? phone.trim() : null;
        const cleanEmail = email !== undefined ? (email && typeof email === 'string' ? email.trim() : null) : null;

        const [result] = await db.query(
            `UPDATE Customer 
             SET name = COALESCE(?, name), 
                 phone = COALESCE(?, phone), 
                 email = COALESCE(?, email) 
             WHERE customer_id = ? AND is_deleted = FALSE`,
            [cleanName, cleanPhone, cleanEmail, customerId]
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
        const customerId = parseId(req.params.id);
        if (!customerId) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID parameter' });
        }

        const [result] = await db.query(
            'UPDATE Customer SET is_deleted = TRUE WHERE customer_id = ? AND is_deleted = FALSE',
            [customerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found or already deleted' });
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
