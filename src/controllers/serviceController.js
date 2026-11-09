const db = require('../config/database');
const PDFDocument = require('pdfkit');

const parseId = (id) => {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const mechanicFields = `ServiceJob.job_id, ServiceJob.car_id, ServiceJob.employee_id,
  ServiceJob.job_date, ServiceJob.description, ServiceJob.status,
  Car.vin, Car.manufacturer, Car.model, Car.year`;
const mechanicView = row => Object.fromEntries(
  ['job_id', 'car_id', 'employee_id', 'job_date', 'description', 'status', 'vin', 'manufacturer', 'model', 'year']
    .filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]])
);
const requireEmployee = (req, res) => {
  if (req.user.role === 'mechanic' && !req.user.employee_id) {
    res.status(403).json({ success: false, message: 'An employee assignment is required' });
    return false;
  }
  return true;
};

const getServices = async (req, res, next) => {
    try {
        if (!requireEmployee(req, res)) return;
        const mechanic = req.user.role === 'mechanic';
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
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
        if (mechanic) query = `SELECT ${mechanicFields} FROM ServiceJob LEFT JOIN Car ON ServiceJob.car_id = Car.car_id LEFT JOIN Customer ON Car.customer_id = Customer.customer_id`;
        let countQuery = `
            SELECT COUNT(*) as total
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
        `;
        let conditions = [];
        let queryParams = [];

        if (mechanic) {
            conditions.push('ServiceJob.employee_id = ? AND EXISTS (SELECT 1 FROM Employee WHERE Employee.employee_id = ServiceJob.employee_id AND is_deleted = FALSE)');
            queryParams.push(req.user.employee_id);
        }
        if (search) {
            conditions.push(mechanic
                ? '(Car.model LIKE ? OR Car.manufacturer LIKE ? OR ServiceJob.description LIKE ?)'
                : '(Customer.name LIKE ? OR Car.model LIKE ? OR Car.manufacturer LIKE ? OR ServiceJob.description LIKE ?)');
            const term = `%${search}%`;
            queryParams.push(...Array(mechanic ? 3 : 4).fill(term));
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
        const total = countResult && countResult[0] ? countResult[0].total : 0;

        res.json({
            success: true,
            data: mechanic ? rows.map(mechanicView) : rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
        });
    } catch (err) {
        next(err);
    }
};

const getServiceById = async (req, res, next) => {
    try {
        if (!requireEmployee(req, res)) return;
        const mechanic = req.user.role === 'mechanic';
        const jobId = parseId(req.params.id);
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'Invalid service job ID parameter' });
        }

        const query = `
            SELECT ServiceJob.*,
                   Car.vin, Car.manufacturer, Car.model, Car.year, Car.color,
                   Customer.name as customer_name, Customer.phone as customer_phone, Customer.email as customer_email,
                   Employee.name as employee_name, Employee.role as employee_role
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            LEFT JOIN Employee ON ServiceJob.employee_id = Employee.employee_id
            WHERE ServiceJob.job_id = ?
        `;
        const [rows] = await db.query(mechanic
            ? `SELECT ${mechanicFields} FROM ServiceJob LEFT JOIN Car ON ServiceJob.car_id = Car.car_id WHERE job_id = ? AND ServiceJob.employee_id = ? AND EXISTS (SELECT 1 FROM Employee WHERE Employee.employee_id = ServiceJob.employee_id AND is_deleted = FALSE)`
            : query, mechanic ? [jobId, req.user.employee_id] : [jobId]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        if (mechanic) return res.json({ success: true, data: mechanicView(rows[0]) });

        // Fetch assigned parts
        const [parts] = await db.query(`
            SELECT ServiceJobPart.*, Part.part_name, Part.part_number
            FROM ServiceJobPart
            JOIN Part ON ServiceJobPart.part_id = Part.part_id
            WHERE ServiceJobPart.job_id = ?
        `, [jobId]);

        res.json({ success: true, data: { ...rows[0], parts } });
    } catch (err) {
        next(err);
    }
};

const createService = async (req, res, next) => {
    try {
        const { car_id, employee_id, job_date, description, total_cost, status } = req.body;

        if (!car_id || !job_date || !description) {
            return res.status(400).json({
                success: false,
                message: 'Car ID, Job Date, and Description are required'
            });
        }

        const cleanCarId = parseInt(car_id, 10);
        const cleanEmpId = employee_id ? parseInt(employee_id, 10) : null;
        const cleanDate = new Date(job_date);
        const cleanDesc = String(description).trim();
        const cleanCost = total_cost !== undefined ? parseFloat(total_cost) : 0.00;
        const cleanStatus = status && ['Pending', 'In Progress', 'Completed'].includes(status)
            ? status
            : 'Pending';

        if (isNaN(cleanCarId) || cleanCarId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid Car ID' });
        }

        if (cleanEmpId !== null && (isNaN(cleanEmpId) || cleanEmpId <= 0)) {
            return res.status(400).json({ success: false, message: 'Invalid Employee ID' });
        }

        if (isNaN(cleanDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid job date format' });
        }

        if (isNaN(cleanCost) || cleanCost < 0) {
            return res.status(400).json({ success: false, message: 'Total cost cannot be negative' });
        }

        // Verify car exists
        const [carCheck] = await db.query('SELECT car_id FROM Car WHERE car_id = ? AND is_deleted = FALSE', [cleanCarId]);
        if (!carCheck || carCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Target vehicle does not exist' });
        }

        if (cleanEmpId) {
            const [empCheck] = await db.query('SELECT employee_id FROM Employee WHERE employee_id = ? AND is_deleted = FALSE', [cleanEmpId]);
            if (!empCheck || empCheck.length === 0) {
                return res.status(400).json({ success: false, message: 'Assigned employee does not exist' });
            }
        }

        const formattedDate = cleanDate.toISOString().split('T')[0];

        const [result] = await db.query(
            `INSERT INTO ServiceJob (car_id, employee_id, job_date, description, total_cost, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cleanCarId, cleanEmpId, formattedDate, cleanDesc, cleanCost, cleanStatus]
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
    let conn;
    try {
        conn = await db.getConnection();
        const jobId = parseId(req.params.id);
        const partId = parseId(req.body.part_id);
        const qty = parseInt(req.body.quantity, 10) || 1;

        if (!jobId) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Invalid service job ID' });
        }

        if (!partId || qty <= 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Valid Part ID and Quantity (>= 1) are required' });
        }

        await conn.beginTransaction();

        // Check if service job exists
        const [jobs] = await conn.query('SELECT job_id FROM ServiceJob WHERE job_id = ? FOR UPDATE', [jobId]);
        if (!jobs || jobs.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        // Check if part exists & lock row FOR UPDATE
        const [parts] = await conn.query('SELECT * FROM Part WHERE part_id = ? AND is_deleted = FALSE FOR UPDATE', [partId]);
        if (!parts || parts.length === 0) {
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
            [qty, partId, qty]
        );

        if (updateStockResult.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ success: false, message: 'Stock update failed due to concurrent stock change' });
        }

        // Insert into ServiceJobPart
        await conn.query(
            'INSERT INTO ServiceJobPart (job_id, part_id, quantity_used, unit_price) VALUES (?, ?, ?, ?)',
            [jobId, partId, qty, part.unit_price]
        );

        // Recalculate ServiceJob total cost
        await conn.query(
            'UPDATE ServiceJob SET total_cost = total_cost + ? WHERE job_id = ?',
            [itemTotalCost, jobId]
        );

        await conn.commit();
        conn.release();

        res.json({
            success: true,
            message: `Added ${qty}x ${part.part_name} to Service Job #${jobId}`,
            addedCost: itemTotalCost
        });
    } catch (err) {
        if (conn) { await conn.rollback(); conn.release(); }
        next(err);
    }
};

const removePartFromServiceJob = async (req, res, next) => {
    let conn;
    try {
        conn = await db.getConnection();
        const jobId = parseId(req.params.id);
        const jobPartId = parseId(req.params.jobPartId);

        if (!jobId || !jobPartId) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Invalid service job ID or part reference ID' });
        }

        await conn.beginTransaction();

        const [jobParts] = await conn.query(
            'SELECT * FROM ServiceJobPart WHERE job_part_id = ? AND job_id = ? FOR UPDATE',
            [jobPartId, jobId]
        );

        if (!jobParts || jobParts.length === 0) {
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
            [restoredCost, jobId]
        );

        // Remove ServiceJobPart entry
        await conn.query('DELETE FROM ServiceJobPart WHERE job_part_id = ?', [jobPartId]);

        await conn.commit();
        conn.release();

        res.json({ success: true, message: 'Assigned part removed and inventory restored successfully' });
    } catch (err) {
        if (conn) { await conn.rollback(); conn.release(); }
        next(err);
    }
};

const updateService = async (req, res, next) => {
    try {
        if (!requireEmployee(req, res)) return;
        const jobId = parseId(req.params.id);
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'Invalid service job ID parameter' });
        }

        const { car_id, employee_id, job_date, description, total_cost, status } = req.body;

        if (car_id === undefined && employee_id === undefined && job_date === undefined &&
            description === undefined && total_cost === undefined && status === undefined) {
            return res.status(400).json({ success: false, message: 'No valid update fields provided' });
        }

        // Mechanic role guardrail: mechanics can only update status and description
        if (req.user && req.user.role === 'mechanic') {
            if (Object.keys(req.body).some(key => !['status', 'description'].includes(key))) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Mechanics are only permitted to update job status and progress notes'
                });
            }
        }

        const cleanCarId = car_id !== undefined ? parseId(car_id) : null;
        const cleanEmpId = employee_id !== undefined ? (employee_id ? parseId(employee_id) : null) : null;
        const cleanDesc = description !== undefined && typeof description === 'string' ? description.trim() : null;
        const cleanCost = total_cost !== undefined ? parseFloat(total_cost) : null;
        const cleanStatus = status !== undefined && ['Pending', 'In Progress', 'Completed'].includes(status) ? status : null;
        let cleanDate = null;

        if (job_date !== undefined) {
            const d = new Date(job_date);
            if (isNaN(d.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid job date provided' });
            }
            cleanDate = d.toISOString().split('T')[0];
        }

        if (cleanCost !== null && (isNaN(cleanCost) || cleanCost < 0)) {
            return res.status(400).json({ success: false, message: 'Total cost cannot be negative' });
        }

        if (req.user.role === 'mechanic') {
            const [result] = await db.query(
                `UPDATE ServiceJob SET description = COALESCE(?, description), status = COALESCE(?, status)
                 WHERE job_id = ? AND employee_id = ? AND EXISTS (SELECT 1 FROM Employee WHERE Employee.employee_id = ServiceJob.employee_id AND is_deleted = FALSE)`,
                [cleanDesc, cleanStatus, jobId, req.user.employee_id]
            );
            if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Service job not found' });
            return res.json({ success: true, message: 'Service job updated successfully' });
        }
        const [result] = await db.query(
            `UPDATE ServiceJob
             SET car_id = COALESCE(?, car_id),
                 employee_id = COALESCE(?, employee_id),
                 job_date = COALESCE(?, job_date),
                 description = COALESCE(?, description),
                 total_cost = COALESCE(?, total_cost),
                 status = COALESCE(?, status)
             WHERE job_id = ?`,
            [cleanCarId, cleanEmpId, cleanDate, cleanDesc, cleanCost, cleanStatus, jobId]
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
    let conn;
    try {
        conn = await db.getConnection();
        const jobId = parseId(req.params.id);
        if (!jobId) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Invalid service job ID parameter' });
        }

        await conn.beginTransaction();

        // Find all assigned parts for this job to restore inventory
        const [assignedParts] = await conn.query(
            'SELECT part_id, quantity_used FROM ServiceJobPart WHERE job_id = ? FOR UPDATE',
            [jobId]
        );

        for (const item of assignedParts) {
            await conn.query(
                'UPDATE Part SET stock_quantity = stock_quantity + ? WHERE part_id = ?',
                [item.quantity_used, item.part_id]
            );
        }

        const [result] = await conn.query('DELETE FROM ServiceJob WHERE job_id = ?', [jobId]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        await conn.commit();
        conn.release();

        res.json({ success: true, message: 'Service job and linked inventory entries deleted/restored successfully' });
    } catch (err) {
        if (conn) { await conn.rollback(); conn.release(); }
        next(err);
    }
};

const downloadInvoicePDF = async (req, res, next) => {
    try {
        const jobId = parseId(req.params.id);
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'Invalid service job ID parameter' });
        }

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
        `, [jobId]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service job not found' });
        }

        const [parts] = await db.query(`
            SELECT ServiceJobPart.*, Part.part_name, Part.part_number
            FROM ServiceJobPart
            JOIN Part ON ServiceJobPart.part_id = Part.part_id
            WHERE ServiceJobPart.job_id = ?
        `, [jobId]);

        const job = rows[0];
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-Job-#${job.job_id}.pdf`);

        doc.pipe(res);

        // Header - Fidelity Modern Corporate Blue & Slate
        doc.fillColor('#0050d7').fontSize(24).font('Helvetica-Bold').text('Auto Repair Hub', { align: 'left' });
        doc.fillColor('#444748').fontSize(10).font('Helvetica').text('123 Pro Fleet Workshop Way, Suite 100', { align: 'left' });
        doc.text('Phone: (555) 019-2831 | Email: billing@autorepairhub.com');
        doc.moveDown();

        doc.strokeColor('#c4c7c8').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Invoice Meta
        doc.fillColor('#1c1b1b').fontSize(16).font('Helvetica-Bold').text(`SERVICE INVOICE #${job.job_id}`);
        doc.fontSize(10).font('Helvetica').text(`Date: ${new Date(job.job_date).toLocaleDateString()}`);
        doc.text(`Status: ${job.status}`);
        doc.moveDown();

        // Customer & Vehicle Details
        doc.fillColor('#1c1b1b').fontSize(12).font('Helvetica-Bold').text('Customer & Vehicle Details:');
        doc.fontSize(10).font('Helvetica').fillColor('#444748');
        doc.text(`Customer Name: ${job.customer_name || 'N/A'}`);
        doc.text(`Phone: ${job.customer_phone || 'N/A'}`);
        doc.text(`Vehicle: ${job.year || ''} ${job.manufacturer || ''} ${job.model || ''} (${job.color || 'Standard'})`);
        doc.text(`VIN: ${job.vin || 'N/A'}`);
        doc.text(`Assigned Technician: ${job.employee_name || 'Unassigned'}`);
        doc.moveDown();

        // Description
        doc.fillColor('#1c1b1b').fontSize(12).font('Helvetica-Bold').text('Service Performed:');
        doc.fontSize(10).font('Helvetica').fillColor('#444748');
        doc.text(`Description: ${job.description}`);
        doc.moveDown();

        // Parts Used Section
        if (parts && parts.length > 0) {
            doc.fillColor('#1c1b1b').fontSize(12).font('Helvetica-Bold').text('Spare Parts & Materials Used:');
            doc.fontSize(10).font('Helvetica').fillColor('#444748');
            parts.forEach(p => {
                const subtotal = (p.quantity_used * parseFloat(p.unit_price)).toFixed(2);
                doc.text(`- ${p.part_name} (${p.part_number}) x${p.quantity_used} @ $${parseFloat(p.unit_price).toFixed(2)} = $${subtotal}`);
            });
            doc.moveDown();
        }

        // Total
        doc.strokeColor('#c4c7c8').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        doc.fillColor('#0050d7').fontSize(14).font('Helvetica-Bold').text(`Total Amount Due: $${parseFloat(job.total_cost).toFixed(2)}`, { align: 'right' });
        doc.moveDown(2);

        doc.fillColor('#747878').fontSize(9).font('Helvetica').text('Thank you for choosing Auto Repair Hub. All services are backed by our Pro Fleet 12-month warranty.', { align: 'center' });

        doc.end();
    } catch (err) {
        next(err);
    }
};

const getTechnicians = async (req, res, next) => {
    try {
        const [data] = await db.query('SELECT employee_id, name, role FROM Employee WHERE is_deleted = FALSE ORDER BY name');
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

module.exports = {
    getTechnicians,
    getServices,
    getServiceById,
    createService,
    addPartToServiceJob,
    removePartFromServiceJob,
    updateService,
    deleteService,
    downloadInvoicePDF
};
