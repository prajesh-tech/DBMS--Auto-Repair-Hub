const db = require('../config/database');

const getParts = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const lowStock = req.query.lowStock === 'true';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM Part WHERE is_deleted = FALSE';
        let countQuery = 'SELECT COUNT(*) as total FROM Part WHERE is_deleted = FALSE';
        let conditions = [];
        let queryParams = [];

        if (search) {
            conditions.push('(part_name LIKE ? OR part_number LIKE ?)');
            const term = `%${search}%`;
            queryParams.push(term, term);
        }

        if (lowStock) {
            conditions.push('stock_quantity <= min_stock_alert');
        }

        if (conditions.length > 0) {
            const whereClause = ' AND ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY part_id DESC LIMIT ? OFFSET ?';

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

const getPartById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM Part WHERE part_id = ? AND is_deleted = FALSE', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Part not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const createPart = async (req, res, next) => {
    try {
        const { part_name, part_number, unit_price, stock_quantity, min_stock_alert } = req.body;

        if (!part_name || !part_number) {
            return res.status(400).json({ success: false, message: 'Part Name and Part Number are required' });
        }

        const [existing] = await db.query('SELECT part_id FROM Part WHERE part_number = ? AND is_deleted = FALSE', [part_number]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Part Number already exists' });
        }

        const [result] = await db.query(
            `INSERT INTO Part (part_name, part_number, unit_price, stock_quantity, min_stock_alert)
             VALUES (?, ?, ?, ?, ?)`,
            [part_name, part_number, unit_price || 0.00, stock_quantity || 0, min_stock_alert || 5]
        );

        res.status(201).json({
            success: true,
            message: 'Part added to inventory',
            partId: result.insertId
        });
    } catch (err) {
        next(err);
    }
};

const updatePart = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { part_name, part_number, unit_price, stock_quantity, min_stock_alert } = req.body;

        const [result] = await db.query(
            `UPDATE Part 
             SET part_name = COALESCE(?, part_name),
                 part_number = COALESCE(?, part_number),
                 unit_price = COALESCE(?, unit_price),
                 stock_quantity = COALESCE(?, stock_quantity),
                 min_stock_alert = COALESCE(?, min_stock_alert)
             WHERE part_id = ? AND is_deleted = FALSE`,
            [part_name || null, part_number || null, unit_price || null, stock_quantity !== undefined ? stock_quantity : null, min_stock_alert || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Part not found' });
        }

        res.json({ success: true, message: 'Part updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deletePart = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Soft delete
        const [result] = await db.query('UPDATE Part SET is_deleted = TRUE WHERE part_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Part not found' });
        }

        res.json({ success: true, message: 'Part removed from inventory' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getParts,
    getPartById,
    createPart,
    updatePart,
    deletePart
};
