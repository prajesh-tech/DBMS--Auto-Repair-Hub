const db = require('../config/database');

const parseId = (id) => {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const getParts = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const lowStock = req.query.lowStock === 'true';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
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

const getPartById = async (req, res, next) => {
    try {
        const partId = parseId(req.params.id);
        if (!partId) {
            return res.status(400).json({ success: false, message: 'Invalid part ID parameter' });
        }

        const [rows] = await db.query('SELECT * FROM Part WHERE part_id = ? AND is_deleted = FALSE', [partId]);

        if (!rows || rows.length === 0) {
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

        if (!part_name || typeof part_name !== 'string' || !part_name.trim() || 
            !part_number || typeof part_number !== 'string' || !part_number.trim()) {
            return res.status(400).json({ success: false, message: 'Part Name and Part Number are required strings' });
        }

        const cleanName = part_name.trim();
        const cleanNumber = part_number.trim();
        const cleanPrice = unit_price !== undefined ? parseFloat(unit_price) : 0.00;
        const cleanStock = stock_quantity !== undefined ? parseInt(stock_quantity, 10) : 0;
        const cleanAlert = min_stock_alert !== undefined ? parseInt(min_stock_alert, 10) : 5;

        if (isNaN(cleanPrice) || cleanPrice < 0) {
            return res.status(400).json({ success: false, message: 'Unit price cannot be negative' });
        }

        if (isNaN(cleanStock) || cleanStock < 0) {
            return res.status(400).json({ success: false, message: 'Stock quantity cannot be negative' });
        }

        if (isNaN(cleanAlert) || cleanAlert < 0) {
            return res.status(400).json({ success: false, message: 'Minimum stock alert cannot be negative' });
        }

        const [existing] = await db.query('SELECT part_id FROM Part WHERE part_number = ? AND is_deleted = FALSE', [cleanNumber]);
        if (existing && existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Part Number already exists' });
        }

        const [result] = await db.query(
            `INSERT INTO Part (part_name, part_number, unit_price, stock_quantity, min_stock_alert)
             VALUES (?, ?, ?, ?, ?)`,
            [cleanName, cleanNumber, cleanPrice, cleanStock, cleanAlert]
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
        const partId = parseId(req.params.id);
        if (!partId) {
            return res.status(400).json({ success: false, message: 'Invalid part ID parameter' });
        }

        const { part_name, part_number, unit_price, stock_quantity, min_stock_alert } = req.body;

        if (part_name === undefined && part_number === undefined && unit_price === undefined && stock_quantity === undefined && min_stock_alert === undefined) {
            return res.status(400).json({ success: false, message: 'No valid update fields provided' });
        }

        const cleanName = part_name !== undefined && typeof part_name === 'string' ? part_name.trim() : null;
        const cleanNumber = part_number !== undefined && typeof part_number === 'string' ? part_number.trim() : null;
        const cleanPrice = unit_price !== undefined ? parseFloat(unit_price) : null;
        const cleanStock = stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null;
        const cleanAlert = min_stock_alert !== undefined ? parseInt(min_stock_alert, 10) : null;

        if (cleanPrice !== null && (isNaN(cleanPrice) || cleanPrice < 0)) {
            return res.status(400).json({ success: false, message: 'Unit price cannot be negative' });
        }

        if (cleanStock !== null && (isNaN(cleanStock) || cleanStock < 0)) {
            return res.status(400).json({ success: false, message: 'Stock quantity cannot be negative' });
        }

        if (cleanAlert !== null && (isNaN(cleanAlert) || cleanAlert < 0)) {
            return res.status(400).json({ success: false, message: 'Minimum stock alert cannot be negative' });
        }

        if (cleanNumber !== null) {
            const [existing] = await db.query('SELECT part_id FROM Part WHERE part_number = ? AND part_id != ? AND is_deleted = FALSE', [cleanNumber, partId]);
            if (existing && existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Part number is already used by another part' });
            }
        }

        const [result] = await db.query(
            `UPDATE Part 
             SET part_name = COALESCE(?, part_name),
                 part_number = COALESCE(?, part_number),
                 unit_price = COALESCE(?, unit_price),
                 stock_quantity = COALESCE(?, stock_quantity),
                 min_stock_alert = COALESCE(?, min_stock_alert)
             WHERE part_id = ? AND is_deleted = FALSE`,
            [cleanName, cleanNumber, cleanPrice, cleanStock, cleanAlert, partId]
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
        const partId = parseId(req.params.id);
        if (!partId) {
            return res.status(400).json({ success: false, message: 'Invalid part ID parameter' });
        }

        const [result] = await db.query('UPDATE Part SET is_deleted = TRUE WHERE part_id = ? AND is_deleted = FALSE', [partId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Part not found or already deleted' });
        }

        res.json({ success: true, message: 'Part deleted successfully' });
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
