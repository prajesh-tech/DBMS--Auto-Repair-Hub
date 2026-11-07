const db = require('../config/database');

const parseId = (id) => {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const getCars = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const offset = (page - 1) * limit;

        let query = `
            SELECT Car.*, Customer.name as customer_name, Customer.phone as customer_phone
            FROM Car
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            WHERE Car.is_deleted = FALSE
        `;
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Car 
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id 
            WHERE Car.is_deleted = FALSE
        `;
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

const getCarById = async (req, res, next) => {
    try {
        const carId = parseId(req.params.id);
        if (!carId) {
            return res.status(400).json({ success: false, message: 'Invalid vehicle ID parameter' });
        }

        const [rows] = await db.query(`
            SELECT Car.*, Customer.name as customer_name, Customer.phone as customer_phone
            FROM Car
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            WHERE Car.car_id = ? AND Car.is_deleted = FALSE
        `, [carId]);

        if (!rows || rows.length === 0) {
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
            return res.status(400).json({ 
                success: false, 
                message: 'VIN, Manufacturer, Model, Year, and Customer ID are required' 
            });
        }

        const cleanVin = String(vin).trim().toUpperCase();
        const cleanMake = String(manufacturer).trim();
        const cleanModel = String(model).trim();
        const cleanYear = parseInt(year, 10);
        const cleanCustId = parseInt(customer_id, 10);
        const cleanColor = color && typeof color === 'string' && color.trim() ? color.trim() : null;

        if (isNaN(cleanYear) || cleanYear < 1900 || cleanYear > new Date().getFullYear() + 2) {
            return res.status(400).json({ success: false, message: 'Invalid model year provided' });
        }

        if (isNaN(cleanCustId) || cleanCustId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID provided' });
        }

        // Check customer exists
        const [customerExists] = await db.query('SELECT customer_id FROM Customer WHERE customer_id = ? AND is_deleted = FALSE', [cleanCustId]);
        if (!customerExists || customerExists.length === 0) {
            return res.status(400).json({ success: false, message: 'Associated customer does not exist' });
        }

        const [existing] = await db.query('SELECT car_id FROM Car WHERE vin = ? AND is_deleted = FALSE', [cleanVin]);
        if (existing && existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Vehicle with this VIN already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO Car (vin, manufacturer, model, year, color, customer_id) VALUES (?, ?, ?, ?, ?, ?)',
            [cleanVin, cleanMake, cleanModel, cleanYear, cleanColor, cleanCustId]
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
        const carId = parseId(req.params.id);
        if (!carId) {
            return res.status(400).json({ success: false, message: 'Invalid vehicle ID parameter' });
        }

        const { vin, manufacturer, model, year, color, customer_id } = req.body;

        if (vin === undefined && manufacturer === undefined && model === undefined && year === undefined && color === undefined && customer_id === undefined) {
            return res.status(400).json({ success: false, message: 'No valid update fields provided' });
        }

        const cleanVin = vin !== undefined && typeof vin === 'string' ? vin.trim().toUpperCase() : null;
        const cleanMake = manufacturer !== undefined && typeof manufacturer === 'string' ? manufacturer.trim() : null;
        const cleanModel = model !== undefined && typeof model === 'string' ? model.trim() : null;
        const cleanYear = year !== undefined ? parseInt(year, 10) : null;
        const cleanColor = color !== undefined ? (color && typeof color === 'string' ? color.trim() : null) : null;
        const cleanCustId = customer_id !== undefined ? parseInt(customer_id, 10) : null;

        if (cleanYear !== null && (isNaN(cleanYear) || cleanYear < 1900 || cleanYear > new Date().getFullYear() + 2)) {
            return res.status(400).json({ success: false, message: 'Invalid model year provided' });
        }

        if (cleanCustId !== null) {
            if (isNaN(cleanCustId) || cleanCustId <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid customer ID provided' });
            }
            const [custCheck] = await db.query('SELECT customer_id FROM Customer WHERE customer_id = ? AND is_deleted = FALSE', [cleanCustId]);
            if (!custCheck || custCheck.length === 0) {
                return res.status(400).json({ success: false, message: 'Associated customer does not exist' });
            }
        }

        const [result] = await db.query(
            `UPDATE Car 
             SET vin = COALESCE(?, vin), 
                 manufacturer = COALESCE(?, manufacturer), 
                 model = COALESCE(?, model), 
                 year = COALESCE(?, year), 
                 color = COALESCE(?, color), 
                 customer_id = COALESCE(?, customer_id) 
             WHERE car_id = ? AND is_deleted = FALSE`,
            [cleanVin, cleanMake, cleanModel, cleanYear, cleanColor, cleanCustId, carId]
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
        const carId = parseId(req.params.id);
        if (!carId) {
            return res.status(400).json({ success: false, message: 'Invalid vehicle ID parameter' });
        }

        const [result] = await db.query('UPDATE Car SET is_deleted = TRUE WHERE car_id = ? AND is_deleted = FALSE', [carId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Car not found or already deleted' });
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
