const { body, param, query, validationResult } = require('express-validator');

// Error handling middleware to catch validation result
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: errors.array().map(err => ({
                field: err.path || err.param || 'unknown',
                message: err.msg
            }))
        });
    }
    next();
};

// Numeric ID parameter validator
const validateIdParam = (paramName = 'id') => [
    param(paramName)
        .isInt({ min: 1 })
        .withMessage(`${paramName} must be a positive integer`),
    validateRequest
];

// Customer Validation Rules
const validateCreateCustomer = [
    body('name')
        .trim()
        .notEmpty().withMessage('Customer name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .isLength({ min: 7, max: 20 }).withMessage('Phone number must be between 7 and 20 characters'),
    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('Must provide a valid email address')
        .normalizeEmail(),
    validateRequest
];

const validateUpdateCustomer = [
    body('name')
        .optional()
        .trim()
        .notEmpty().withMessage('Name cannot be empty')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .trim()
        .notEmpty().withMessage('Phone cannot be empty')
        .isLength({ min: 7, max: 20 }).withMessage('Phone number must be between 7 and 20 characters'),
    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('Must provide a valid email address')
        .normalizeEmail(),
    validateRequest
];

// Car / Vehicle Validation Rules (17-char ISO VIN)
const validateCreateCar = [
    body('vin')
        .trim()
        .notEmpty().withMessage('VIN is required')
        .isLength({ min: 17, max: 17 }).withMessage('VIN must be exactly 17 characters')
        .isAlphanumeric().withMessage('VIN must only contain alphanumeric characters')
        .toUpperCase(),
    body('manufacturer')
        .trim()
        .notEmpty().withMessage('Manufacturer is required')
        .isLength({ min: 1, max: 50 }).withMessage('Manufacturer cannot exceed 50 characters'),
    body('model')
        .trim()
        .notEmpty().withMessage('Model is required')
        .isLength({ min: 1, max: 50 }).withMessage('Model cannot exceed 50 characters'),
    body('year')
        .notEmpty().withMessage('Model year is required')
        .isInt({ min: 1900, max: new Date().getFullYear() + 2 })
        .withMessage(`Year must be a valid integer between 1900 and ${new Date().getFullYear() + 2}`),
    body('color')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 30 }).withMessage('Color cannot exceed 30 characters'),
    body('customer_id')
        .notEmpty().withMessage('Owner Customer ID is required')
        .isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
    validateRequest
];

const validateUpdateCar = [
    body('vin')
        .optional()
        .trim()
        .isLength({ min: 17, max: 17 }).withMessage('VIN must be exactly 17 characters')
        .isAlphanumeric().withMessage('VIN must only contain alphanumeric characters')
        .toUpperCase(),
    body('manufacturer')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Manufacturer cannot exceed 50 characters'),
    body('model')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Model cannot exceed 50 characters'),
    body('year')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 2 })
        .withMessage(`Year must be a valid integer between 1900 and ${new Date().getFullYear() + 2}`),
    body('color')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 30 }).withMessage('Color cannot exceed 30 characters'),
    body('customer_id')
        .optional()
        .isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
    validateRequest
];

// Part / Inventory Validation Rules
const validateCreatePart = [
    body('part_name')
        .trim()
        .notEmpty().withMessage('Part name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Part name cannot exceed 100 characters'),
    body('part_number')
        .trim()
        .notEmpty().withMessage('Part number / SKU is required')
        .isLength({ min: 1, max: 50 }).withMessage('Part number cannot exceed 50 characters'),
    body('unit_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
    body('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    body('min_stock_alert')
        .optional()
        .isInt({ min: 0 }).withMessage('Minimum stock alert must be a non-negative integer'),
    validateRequest
];

const validateUpdatePart = [
    body('part_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Part name cannot exceed 100 characters'),
    body('part_number')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Part number cannot exceed 50 characters'),
    body('unit_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
    body('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    body('min_stock_alert')
        .optional()
        .isInt({ min: 0 }).withMessage('Minimum stock alert must be a non-negative integer'),
    validateRequest
];

// Service Job Validation Rules
const validateCreateServiceJob = [
    body('car_id')
        .notEmpty().withMessage('Vehicle ID is required')
        .isInt({ min: 1 }).withMessage('Vehicle ID must be a positive integer'),
    body('employee_id')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('Assigned Employee ID must be a positive integer'),
    body('job_date')
        .notEmpty().withMessage('Job date is required')
        .isISO8601().withMessage('Job date must be a valid ISO format date (YYYY-MM-DD)'),
    body('description')
        .trim()
        .notEmpty().withMessage('Job description is required')
        .isLength({ min: 3, max: 500 }).withMessage('Description must be between 3 and 500 characters'),
    body('total_cost')
        .optional()
        .isFloat({ min: 0 }).withMessage('Total cost must be a non-negative number'),
    body('status')
        .optional()
        .isIn(['Pending', 'In Progress', 'Completed'])
        .withMessage('Status must be one of: Pending, In Progress, Completed'),
    validateRequest
];

const validateUpdateServiceJob = [
    body('car_id')
        .optional()
        .isInt({ min: 1 }).withMessage('Vehicle ID must be a positive integer'),
    body('employee_id')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('Assigned Employee ID must be a positive integer'),
    body('job_date')
        .optional()
        .isISO8601().withMessage('Job date must be a valid ISO format date (YYYY-MM-DD)'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 3, max: 500 }).withMessage('Description must be between 3 and 500 characters'),
    body('total_cost')
        .optional()
        .isFloat({ min: 0 }).withMessage('Total cost must be a non-negative number'),
    body('status')
        .optional()
        .isIn(['Pending', 'In Progress', 'Completed'])
        .withMessage('Status must be one of: Pending, In Progress, Completed'),
    validateRequest
];

const validateAddPartToJob = [
    body('part_id')
        .notEmpty().withMessage('Part ID is required')
        .isInt({ min: 1 }).withMessage('Part ID must be a positive integer'),
    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1 }).withMessage('Quantity must be an integer of at least 1'),
    validateRequest
];

// Employee Validation Rules
const validateCreateEmployee = [
    body('name')
        .trim()
        .notEmpty().withMessage('Employee name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('role')
        .trim()
        .notEmpty().withMessage('Role / Position is required')
        .isLength({ min: 2, max: 50 }).withMessage('Role must be between 2 and 50 characters'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 5, max: 20 }).withMessage('Phone number must be between 5 and 20 characters'),
    body('salary')
        .optional()
        .isFloat({ min: 0 }).withMessage('Salary must be a non-negative number'),
    validateRequest
];

const validateUpdateEmployee = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('role')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Role must be between 2 and 50 characters'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 5, max: 20 }).withMessage('Phone number must be between 5 and 20 characters'),
    body('salary')
        .optional()
        .isFloat({ min: 0 }).withMessage('Salary must be a non-negative number'),
    validateRequest
];

// Auth Validation Rules
const validateLogin = [
    body('username')
        .isString().bail()
        .trim()
        .notEmpty().withMessage('Username is required'),
    body('password')
        .isString().bail()
        .notEmpty().withMessage('Password is required')
        .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes'),
    validateRequest
];

const validateRegister = [
    body('employee_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('username')
        .isString().bail()
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain alphanumeric characters and underscores'),
    body('password')
        .isString().bail()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .custom((value) => Buffer.byteLength(String(value), 'utf8') <= 72)
        .withMessage('Password must be at most 72 bytes')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one digit')
        .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
    body('role')
        .isString().bail()
        .notEmpty().withMessage('Role is required')
        .toLowerCase()
        .isIn(['admin', 'staff', 'mechanic'])
        .withMessage('Role must be one of: admin, staff, mechanic'),
    validateRequest
];

const validateChangePassword = [
    body('currentPassword')
        .isString().bail()
        .notEmpty().withMessage('Current password is required')
        .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes'),
    body('newPassword')
        .isString().bail()
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .custom((value) => Buffer.byteLength(String(value), 'utf8') <= 72)
        .withMessage('Password must be at most 72 bytes')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one digit')
        .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
    validateRequest
];

const validateEmployeeLink = [
    param('id').isInt({ min: 1 }),
    body('employee_id').exists({ checkNull: false }).bail().custom(value => value === null || (Number.isInteger(value) && value > 0)),
    validateRequest
];
const validateList = [
    query('page').optional().isInt({ min: 1, max: 1000000 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().isLength({ max: 200 }),
    query('status').optional().isIn(['', 'Pending', 'In Progress', 'Completed']),
    query('lowStock').optional().isIn(['true', 'false']),
    query('timeframe').optional().isIn(['all', 'today', 'week', 'month', 'year']),
    query('sort').not().exists().withMessage('Custom sorting is not supported'),
    validateRequest
];

module.exports = {
    validateList,
    validateEmployeeLink,
    validateRequest,
    validateIdParam,
    validateCreateCustomer,
    validateUpdateCustomer,
    validateCreateCar,
    validateUpdateCar,
    validateCreatePart,
    validateUpdatePart,
    validateCreateServiceJob,
    validateUpdateServiceJob,
    validateAddPartToJob,
    validateCreateEmployee,
    validateUpdateEmployee,
    validateLogin,
    validateRegister,
    validateChangePassword
};
