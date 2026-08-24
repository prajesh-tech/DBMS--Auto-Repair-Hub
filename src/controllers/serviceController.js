const db = require('../config/database');
const PDFDocument = require('pdfkit');

const getServices = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = `
            SELECT ServiceJob.*, 
                   Car.vin, Car.manufacturer, Car.model, Car.year,
                   Customer.name as customer_name, Customer.phone as customer_phone, Customer.email as customer_email,
                   Employee.name as employee_name, Employee.role as employee_role
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            LEFT JOIN Employee ON ServiceJob.employee_id = Employee.employee_id
        `;
        let countQuery = `
            SELECT COUNT(*) as total
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
        `;
        let conditions = [];
        let queryParams = [];

        if (search) {
            conditions.push('(Customer.name LIKE ? OR Car.model LIKE ? OR ServiceJob.description LIKE ?)');
            const term = `%${search}%`;
            queryParams.push(term, term, term);
        }

        if (statusFilter) {
            conditions.push('ServiceJob.status = ?');
            queryParams.push(statusFilter);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY ServiceJob.job_id DESC LIMIT ? OFFSET ?';

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

const getServiceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT ServiceJob.*, 
                   Car.vin, Car.manufacturer, Car.model, Car.year, Car.color,
                   Customer.name as customer_name, Customer.phone as customer_phone, Customer.email as customer_email,
                   Employee.name as employee_name, Employee.role as employee_role
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            LEFT JOIN Employee ON ServiceJob.employee_id = Employee.employee_id
            WHERE ServiceJob.job_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        // Fetch assigned parts
        const [parts] = await db.query(`
            SELECT ServiceJobPart.*, Part.part_name, Part.part_number
            FROM ServiceJobPart
            JOIN Part ON ServiceJobPart.part_id = Part.part_id
            WHERE ServiceJobPart.job_id = ?
        `, [id]);

        res.json({ success: true, data: { ...rows[0], parts } });
    } catch (err) {
        next(err);
    }
};

const createService = async (req, res, next) => {
    try {
        const { car_id, employee_id, job_date, description, total_cost, status } = req.body;

        if (!car_id || !job_date || !description) {
            return res.status(400).json({ success: false, message: 'Car ID, Job Date, and Description are required' });
        }

        const [result] = await db.query(
            `INSERT INTO ServiceJob (car_id, employee_id, job_date, description, total_cost, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [car_id, employee_id || null, job_date, description, total_cost || 0.00, status || 'Pending']
        );

        res.status(201).json({
            success: true,
            message: 'Service job added successfully',
            jobId: result.insertId
        });
    } catch (err) {
        next(err);
    }
};

const addPartToServiceJob = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        const { id } = req.params; // job_id
        const { part_id, quantity } = req.body;

        const qty = parseInt(quantity) || 1;

        if (!part_id || qty <= 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Valid Part ID and Quantity required' });
        }

        await conn.beginTransaction();

        // Check if service job exists
        const [jobs] = await conn.query('SELECT job_id FROM ServiceJob WHERE job_id = ? FOR UPDATE', [id]);
        if (jobs.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        // Check if part exists & lock row FOR UPDATE
        const [parts] = await conn.query('SELECT * FROM Part WHERE part_id = ? AND is_deleted = FALSE FOR UPDATE', [part_id]);
        if (parts.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Part not found' });
        }

        const part = parts[0];

        if (part.stock_quantity <= 0 || part.stock_quantity < qty) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({
                success: false,
                message: `Insufficient stock! Only ${part.stock_quantity} units available for ${part.part_name}.`
            });
        }

        const itemTotalCost = parseFloat(part.unit_price) * qty;

        // Deduct stock safely ensuring stock_quantity doesn't drop below 0
        const [updateStockResult] = await conn.query(
            'UPDATE Part SET stock_quantity = stock_quantity - ? WHERE part_id = ? AND stock_quantity >= ?',
            [qty, part_id, qty]
        );

        if (updateStockResult.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ success: false, message: 'Stock update failed due to concurrent stock change' });
        }

        // Insert into ServiceJobPart
        await conn.query(
            'INSERT INTO ServiceJobPart (job_id, part_id, quantity_used, unit_price) VALUES (?, ?, ?, ?)',
            [id, part_id, qty, part.unit_price]
        );

        // Recalculate ServiceJob total cost
        await conn.query(
            'UPDATE ServiceJob SET total_cost = total_cost + ? WHERE job_id = ?',
            [itemTotalCost, id]
        );

        await conn.commit();
        conn.release();

        console.log(`[AUDIT INVENTORY]: Job #${id} assigned ${qty}x Part #${part_id} (${part.part_name}). New stock: ${part.stock_quantity - qty}`);

        res.json({
            success: true,
            message: `Added ${qty}x ${part.part_name} to Service Job #${id}`,
            addedCost: itemTotalCost
        });
    } catch (err) {
        await conn.rollback();
        conn.release();
        next(err);
    }
};

const removePartFromServiceJob = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        const { id, jobPartId } = req.params; // job_id and job_part_id

        await conn.beginTransaction();

        const [jobParts] = await conn.query(
            'SELECT * FROM ServiceJobPart WHERE job_part_id = ? AND job_id = ? FOR UPDATE',
            [jobPartId, id]
        );

        if (jobParts.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Assigned part entry not found for this service job' });
        }

        const jp = jobParts[0];
        const restoredCost = parseFloat(jp.unit_price) * jp.quantity_used;

        // Restore Part stock_quantity
        await conn.query(
            'UPDATE Part SET stock_quantity = stock_quantity + ? WHERE part_id = ?',
            [jp.quantity_used, jp.part_id]
        );

        // Deduct cost from ServiceJob
        await conn.query(
            'UPDATE ServiceJob SET total_cost = GREATEST(0, total_cost - ?) WHERE job_id = ?',
            [restoredCost, id]
        );

        // Remove ServiceJobPart entry
        await conn.query('DELETE FROM ServiceJobPart WHERE job_part_id = ?', [jobPartId]);

        await conn.commit();
        conn.release();

        console.log(`[AUDIT INVENTORY RESTORE]: Job #${id} removed JobPart #${jobPartId}. Restored ${jp.quantity_used}x to Part #${jp.part_id}`);

        res.json({ success: true, message: 'Assigned part removed and inventory restored successfully' });
    } catch (err) {
        await conn.rollback();
        conn.release();
        next(err);
    }
};

const updateService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { car_id, employee_id, job_date, description, total_cost, status } = req.body;

        const [result] = await db.query(
            `UPDATE ServiceJob 
             SET car_id = COALESCE(?, car_id), 
                 employee_id = COALESCE(?, employee_id), 
                 job_date = COALESCE(?, job_date), 
                 description = COALESCE(?, description), 
                 total_cost = COALESCE(?, total_cost), 
                 status = COALESCE(?, status) 
             WHERE job_id = ?`,
            [car_id || null, employee_id || null, job_date || null, description || null, total_cost || null, status || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        res.json({ success: true, message: 'Service job updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteService = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        const { id } = req.params;
        await conn.beginTransaction();

        // Find all assigned parts for this job to restore inventory
        const [assignedParts] = await conn.query(
            'SELECT part_id, quantity_used FROM ServiceJobPart WHERE job_id = ? FOR UPDATE',
            [id]
        );

        for (const item of assignedParts) {
            await conn.query(
                'UPDATE Part SET stock_quantity = stock_quantity + ? WHERE part_id = ?',
                [item.quantity_used, item.part_id]
            );
            console.log(`[AUDIT INVENTORY RESTORE ON JOB DELETE]: Job #${id} deleted. Restored ${item.quantity_used}x to Part #${item.part_id}`);
        }

        const [result] = await conn.query('DELETE FROM ServiceJob WHERE job_id = ?', [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        await conn.commit();
        conn.release();

        res.json({ success: true, message: 'Service job and linked inventory entries deleted/restored successfully' });
    } catch (err) {
        await conn.rollback();
        conn.release();
        next(err);
    }
};

const downloadInvoicePDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT ServiceJob.*, 
                   Car.vin, Car.manufacturer, Car.model, Car.year, Car.color,
                   Customer.name as customer_name, Customer.phone as customer_phone, Customer.email as customer_email,
                   Employee.name as employee_name
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            LEFT JOIN Employee ON ServiceJob.employee_id = Employee.employee_id
            WHERE ServiceJob.job_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        const [parts] = await db.query(`
            SELECT ServiceJobPart.*, Part.part_name, Part.part_number
            FROM ServiceJobPart
            JOIN Part ON ServiceJobPart.part_id = Part.part_id
            WHERE ServiceJobPart.job_id = ?
        `, [id]);

        const job = rows[0];
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-Job-#${job.job_id}.pdf`);

        doc.pipe(res);

        // Header
        doc.fillColor('#c9a227').fontSize(24).text('Auto Repair Hub', { align: 'left' });
        doc.fillColor('#555555').fontSize(10).text('123 Repair Street, Auto City', { align: 'left' });
        doc.text('Phone: (555) 019-2831 | Email: support@autorepairhub.com');
        doc.moveDown();

        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Invoice Meta
        doc.fillColor('#333333').fontSize(16).text(`SERVICE INVOICE #${job.job_id}`, { underline: true });
        doc.fontSize(10).text(`Date: ${new Date(job.job_date).toLocaleDateString()}`);
        doc.text(`Status: ${job.status}`);
        doc.moveDown();

        // Customer & Vehicle Details
        doc.fillColor('#222222').fontSize(12).text('Customer & Vehicle Details:');
        doc.fontSize(10).fillColor('#444444');
        doc.text(`Customer Name: ${job.customer_name || 'N/A'}`);
        doc.text(`Phone: ${job.customer_phone || 'N/A'}`);
        doc.text(`Vehicle: ${job.year || ''} ${job.manufacturer || ''} ${job.model || ''} (${job.color || ''})`);
        doc.text(`VIN: ${job.vin || 'N/A'}`);
        doc.text(`Assigned Employee: ${job.employee_name || 'Unassigned'}`);
        doc.moveDown();

        // Description
        doc.fillColor('#222222').fontSize(12).text('Service Performed:');
        doc.fontSize(10).fillColor('#444444');
        doc.text(`Description: ${job.description}`);
        doc.moveDown();

        // Parts Used Section
        if (parts.length > 0) {
            doc.fillColor('#222222').fontSize(12).text('Spare Parts & Materials Used:');
            doc.fontSize(10).fillColor('#444444');
            parts.forEach(p => {
                const subtotal = (p.quantity_used * parseFloat(p.unit_price)).toFixed(2);
                doc.text(`- ${p.part_name} (${p.part_number}) x${p.quantity_used} @ $${parseFloat(p.unit_price).toFixed(2)} = $${subtotal}`);
            });
            doc.moveDown();
        }

        // Total
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        doc.fillColor('#c9a227').fontSize(14).text(`Total Cost: $${parseFloat(job.total_cost).toFixed(2)}`, { align: 'right' });
        doc.moveDown(2);

        doc.fillColor('#777777').fontSize(9).text('Thank you for choosing Auto Repair Hub for your automotive service needs!', { align: 'center' });

        doc.end();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getServices,
    getServiceById,
    createService,
    addPartToServiceJob,
    removePartFromServiceJob,
    updateService,
    deleteService,
    downloadInvoicePDF
};
