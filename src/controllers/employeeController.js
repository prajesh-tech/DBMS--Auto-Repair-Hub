const db = require('../config/database');

const parseId = (id) => {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const getEmployees = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
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
        const total = countResult && countResult[0] ? countResult[0].total : 0;

        res.json({
            success: true,
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
        });
    } catch (err) {
        next(err);
    }
};

const getEmployeeById = async (req, res, next) => {
    try {
        const employeeId = parseId(req.params.id);
        if (!employeeId) {
            return res.status(400).json({ success: false, message: 'Invalid employee ID parameter' });
        }

        const [rows] = await db.query('SELECT * FROM Employee WHERE employee_id = ? AND is_deleted = FALSE', [employeeId]);

        if (!rows || rows.length === 0) {
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

        if (!name || typeof name !== 'string' || !name.trim() || 
            !role || typeof role !== 'string' || !role.trim()) {
            return res.status(400).json({ success: false, message: 'Name and Role are required strings' });
        }

        const cleanName = name.trim();
        const cleanRole = role.trim();
        const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;
        const cleanSalary = salary !== undefined ? parseFloat(salary) : 0.00;

        if (isNaN(cleanSalary) || cleanSalary < 0) {
            return res.status(400).json({ success: false, message: 'Salary cannot be negative' });
        }

        const [result] = await db.query(
            'INSERT INTO Employee (name, role, phone, salary) VALUES (?, ?, ?, ?)',
            [cleanName, cleanRole, cleanPhone, cleanSalary]
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
        const employeeId = parseId(req.params.id);
        if (!employeeId) {
            return res.status(400).json({ success: false, message: 'Invalid employee ID parameter' });
        }

        const { name, role, phone, salary } = req.body;

        if (name === undefined && role === undefined && phone === undefined && salary === undefined) {
            return res.status(400).json({ success: false, message: 'No valid update fields provided' });
        }

        const cleanName = name !== undefined && typeof name === 'string' ? name.trim() : null;
        const cleanRole = role !== undefined && typeof role === 'string' ? role.trim() : null;
        const cleanPhone = phone !== undefined ? (phone && typeof phone === 'string' ? phone.trim() : null) : null;
        const cleanSalary = salary !== undefined ? parseFloat(salary) : null;

        if (cleanSalary !== null && (isNaN(cleanSalary) || cleanSalary < 0)) {
            return res.status(400).json({ success: false, message: 'Salary cannot be negative' });
        }

        const [result] = await db.query(
            `UPDATE Employee 
             SET name = COALESCE(?, name), 
                 role = COALESCE(?, role), 
                 phone = COALESCE(?, phone), 
                 salary = COALESCE(?, salary) 
             WHERE employee_id = ? AND is_deleted = FALSE`,
            [cleanName, cleanRole, cleanPhone, cleanSalary, employeeId]
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
        const employeeId = parseId(req.params.id);
        if (!employeeId) {
            return res.status(400).json({ success: false, message: 'Invalid employee ID parameter' });
        }

        const [result] = await db.query('UPDATE Employee SET is_deleted = TRUE WHERE employee_id = ? AND is_deleted = FALSE', [employeeId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found or already deleted' });
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
