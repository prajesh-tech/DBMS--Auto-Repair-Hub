const db = require('../config/database');

const getCars = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = `
            SELECT Car.*, Customer.name as customer_name, Customer.phone as customer_phone
            FROM Car
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            WHERE Car.is_deleted = FALSE
        `;
        let countQuery = `SELECT COUNT(*) as total FROM Car LEFT JOIN Customer ON Car.customer_id = Customer.customer_id WHERE Car.is_deleted = FALSE`;
        let queryParams = [];

        if (search) {
            query += ' AND (Car.vin LIKE ? OR Car.model LIKE ? OR Car.manufacturer LIKE ? OR Customer.name LIKE ?)';
            countQuery += ' AND (Car.vin LIKE ? OR Car.model LIKE ? OR Car.manufacturer LIKE ? OR Customer.name LIKE ?)';
            const term = `%${search}%`;
            queryParams = [term, term, term, term];
        }

        query += ' ORDER BY Car.car_id DESC LIMIT ? OFFSET ?';

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

const getCarById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT Car.*, Customer.name as customer_name, Customer.phone as customer_phone
            FROM Car
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            WHERE Car.car_id = ? AND Car.is_deleted = FALSE
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Car not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const createCar = async (req, res, next) => {
    try {
        const { vin, manufacturer, model, year, color, customer_id } = req.body;

        if (!vin || !manufacturer || !model || !year || !customer_id) {
            return res.status(400).json({ success: false, message: 'VIN, Manufacturer, Model, Year, and Customer ID are required' });
        }

        const [existing] = await db.query('SELECT car_id FROM Car WHERE vin = ? AND is_deleted = FALSE', [vin]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Vehicle with this VIN already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO Car (vin, manufacturer, model, year, color, customer_id) VALUES (?, ?, ?, ?, ?, ?)',
            [vin, manufacturer, model, year, color || null, customer_id]
        );

        res.status(201).json({
            success: true,
            message: 'Car added successfully',
            carId: result.insertId
        });
    } catch (err) {
        next(err);
    }
};

const updateCar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { vin, manufacturer, model, year, color, customer_id } = req.body;

        const [result] = await db.query(
            `UPDATE Car 
             SET vin = COALESCE(?, vin), 
                 manufacturer = COALESCE(?, manufacturer), 
                 model = COALESCE(?, model), 
                 year = COALESCE(?, year), 
                 color = COALESCE(?, color), 
                 customer_id = COALESCE(?, customer_id) 
             WHERE car_id = ? AND is_deleted = FALSE`,
            [vin || null, manufacturer || null, model || null, year || null, color || null, customer_id || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Car not found' });
        }

        res.json({ success: true, message: 'Car updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteCar = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Soft Delete
        const [result] = await db.query('UPDATE Car SET is_deleted = TRUE WHERE car_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Car not found' });
        }

        res.json({ success: true, message: 'Car deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCars,
    getCarById,
    createCar,
    updateCar,
    deleteCar
};
