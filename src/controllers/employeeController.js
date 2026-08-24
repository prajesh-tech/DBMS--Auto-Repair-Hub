const db = require('../config/database');

const getEmployees = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM Employee WHERE is_deleted = FALSE';
        let countQuery = 'SELECT COUNT(*) as total FROM Employee WHERE is_deleted = FALSE';
        let queryParams = [];

        if (search) {
            query += ' AND (name LIKE ? OR role LIKE ? OR phone LIKE ?)';
            countQuery += ' AND (name LIKE ? OR role LIKE ? OR phone LIKE ?)';
            const term = `%${search}%`;
            queryParams = [term, term, term];
        }

        query += ' ORDER BY employee_id DESC LIMIT ? OFFSET ?';

        const [rows] = await db.query(query, [...queryParams, limit, offset]);
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        next(err);
    }
};

const getEmployeeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM Employee WHERE employee_id = ? AND is_deleted = FALSE', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const createEmployee = async (req, res, next) => {
    try {
        const { name, role, phone, salary } = req.body;

        if (!name || !role) {
            return res.status(400).json({ success: false, message: 'Name and Role are required' });
        }

        const [result] = await db.query(
            'INSERT INTO Employee (name, role, phone, salary) VALUES (?, ?, ?, ?)',
            [name, role, phone || null, salary || 0.00]
        );

        res.status(201).json({
            success: true,
            message: 'Employee added successfully',
            employeeId: result.insertId
        });
    } catch (err) {
        next(err);
    }
};

const updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, role, phone, salary } = req.body;

        if (!name || !role) {
            return res.status(400).json({ success: false, message: 'Name and Role are required' });
        }

        const [result] = await db.query(
            'UPDATE Employee SET name = ?, role = ?, phone = ?, salary = ? WHERE employee_id = ? AND is_deleted = FALSE',
            [name, role, phone || null, salary || 0.00, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, message: 'Employee updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Soft Delete
        const [result] = await db.query('UPDATE Employee SET is_deleted = TRUE WHERE employee_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
