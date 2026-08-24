const db = require('../config/database');

const getDashboardStats = async (req, res, next) => {
    try {
        const timeframe = req.query.timeframe || 'all';

        let dateCondition = '';
        if (timeframe === 'today') {
            dateCondition = ' AND DATE(job_date) = CURDATE()';
        } else if (timeframe === 'week') {
            dateCondition = ' AND job_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (timeframe === 'month') {
            dateCondition = ' AND job_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (timeframe === 'year') {
            dateCondition = ' AND job_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
        }

        const [[{ totalCustomers }]] = await db.query('SELECT COUNT(*) as totalCustomers FROM Customer WHERE is_deleted = FALSE');
        const [[{ totalCars }]] = await db.query('SELECT COUNT(*) as totalCars FROM Car WHERE is_deleted = FALSE');
        const [[{ totalEmployees }]] = await db.query('SELECT COUNT(*) as totalEmployees FROM Employee WHERE is_deleted = FALSE');
        const [[{ activeJobs }]] = await db.query(`SELECT COUNT(*) as activeJobs FROM ServiceJob WHERE status IN ('Pending', 'In Progress') ${dateCondition}`);
        const [[{ completedJobs }]] = await db.query(`SELECT COUNT(*) as completedJobs FROM ServiceJob WHERE status = 'Completed' ${dateCondition}`);
        const [[{ totalServices }]] = await db.query(`SELECT COUNT(*) as totalServices FROM ServiceJob WHERE 1=1 ${dateCondition}`);
        const [[{ totalRevenue }]] = await db.query(`SELECT COALESCE(SUM(total_cost), 0) as totalRevenue FROM ServiceJob WHERE status = 'Completed' ${dateCondition}`);

        // Calculate Parts Revenue vs Labor Revenue
        const [[{ partsRevenue }]] = await db.query(`
            SELECT COALESCE(SUM(ServiceJobPart.quantity_used * ServiceJobPart.unit_price), 0) as partsRevenue
            FROM ServiceJobPart
            JOIN ServiceJob ON ServiceJobPart.job_id = ServiceJob.job_id
            WHERE ServiceJob.status = 'Completed' ${dateCondition}
        `);

        const laborRevenue = Math.max(0, parseFloat(totalRevenue) - parseFloat(partsRevenue));
        const avgInvoice = completedJobs > 0 ? (parseFloat(totalRevenue) / completedJobs).toFixed(2) : '0.00';

        // Monthly / Daily Revenue Trends
        const [revenueTrends] = await db.query(`
            SELECT DATE_FORMAT(job_date, '%Y-%m-%d') as date, 
                   COALESCE(SUM(total_cost), 0) as revenue,
                   COUNT(*) as job_count
            FROM ServiceJob
            WHERE status = 'Completed' ${dateCondition}
            GROUP BY DATE_FORMAT(job_date, '%Y-%m-%d')
            ORDER BY date ASC
            LIMIT 30
        `);

        const [recentServices] = await db.query(`
            SELECT ServiceJob.job_id, ServiceJob.job_date, ServiceJob.status, ServiceJob.total_cost,
                   Car.model, Customer.name as customer_name
            FROM ServiceJob
            LEFT JOIN Car ON ServiceJob.car_id = Car.car_id
            LEFT JOIN Customer ON Car.customer_id = Customer.customer_id
            ORDER BY ServiceJob.job_id DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            timeframe,
            stats: {
                totalCustomers,
                totalCars,
                totalEmployees,
                activeJobs,
                completedJobs,
                totalServices,
                totalRevenue: parseFloat(totalRevenue).toFixed(2),
                partsRevenue: parseFloat(partsRevenue).toFixed(2),
                laborRevenue: parseFloat(laborRevenue).toFixed(2),
                averageInvoice: avgInvoice
            },
            revenueTrends,
            recentServices
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardStats
};
