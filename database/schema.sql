-- Auto Repair Hub - Database Migration & Seed Script (v3.0)
CREATE DATABASE IF NOT EXISTS auto_repair_hub;
USE auto_repair_hub;

-- Disable foreign key checks for safe table drops
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ServiceJobPart;
DROP TABLE IF EXISTS Part;
DROP TABLE IF EXISTS ServiceJob;
DROP TABLE IF EXISTS Car;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS User;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table (Authentication)
CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff', 'mechanic') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Customers Table
CREATE TABLE Customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Employees Table
CREATE TABLE Employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    salary DECIMAL(10,2) DEFAULT 0.00,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Cars Table
CREATE TABLE Car (
    car_id INT AUTO_INCREMENT PRIMARY KEY,
    vin VARCHAR(17) NOT NULL UNIQUE,
    manufacturer VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(30),
    customer_id INT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. ServiceJob Table
CREATE TABLE ServiceJob (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    employee_id INT,
    job_date DATE NOT NULL,
    description TEXT,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES Car(car_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. Part Table (Inventory)
CREATE TABLE Part (
    part_id INT AUTO_INCREMENT PRIMARY KEY,
    part_name VARCHAR(100) NOT NULL,
    part_number VARCHAR(50) NOT NULL UNIQUE,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 5,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. ServiceJobPart Table (Parts assigned to jobs)
CREATE TABLE ServiceJobPart (
    job_part_id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity_used INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES ServiceJob(job_id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES Part(part_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indexes for performance
CREATE INDEX idx_car_customer ON Car(customer_id);
CREATE INDEX idx_service_car ON ServiceJob(car_id);
CREATE INDEX idx_service_employee ON ServiceJob(employee_id);
CREATE INDEX idx_service_status ON ServiceJob(status);
CREATE INDEX idx_part_number ON Part(part_number);

-- Seed Data: System Users (Admin, Staff, Mechanic)
INSERT INTO User (username, password_hash, role) VALUES 
('admin', '$2a$10$7R0Z4K0mJ6N5bWwU3D5e0eX7N8M9L0K1J2H3G4F5E6D7C8B9A0', 'admin'),
('staff', '$2a$10$7R0Z4K0mJ6N5bWwU3D5e0eX7N8M9L0K1J2H3G4F5E6D7C8B9A0', 'staff'),
('mechanic', '$2a$10$7R0Z4K0mJ6N5bWwU3D5e0eX7N8M9L0K1J2H3G4F5E6D7C8B9A0', 'mechanic');

-- Seed Data: 10 Customers
INSERT INTO Customer (name, phone, email) VALUES
('John Doe', '555-0192', 'john.doe@example.com'),
('Sarah Connor', '555-0143', 'sarah.c@example.com'),
('Michael Scott', '555-0188', 'm.scott@dundermifflin.com'),
('Robert Chen', '555-0210', 'r.chen@techcorp.io'),
('Emma Davis', '555-0211', 'emma.davis@designstudio.com'),
('Marcus Johnson', '555-0212', 'marcus.j@freightlogistics.com'),
('Sophia Rodriguez', '555-0213', 'sophia.r@medcenter.org'),
('David Wilson', '555-0214', 'dwilson@realtygroup.com'),
('Olivia Martinez', '555-0215', 'olivia.m@lawpractice.com'),
('James Taylor', '555-0216', 'jtaylor@financeservices.com');

-- Seed Data: 8 Employees
INSERT INTO Employee (name, role, phone, salary) VALUES
('Alex Rivera', 'Senior Mechanic', '555-0201', 65000.00),
('David Miller', 'Diagnostic Specialist', '555-0202', 58000.00),
('Emily Watson', 'Service Advisor', '555-0203', 48000.00),
('Carlos Santana', 'Master Technician', '555-0204', 72000.00),
('Nina Patel', 'EV & Electrical Specialist', '555-0205', 68000.00),
('James O\'Connor', 'Shop Manager', '555-0206', 82000.00),
('Liam Brown', 'Quick Lube Technician', '555-0207', 42000.00),
('Maya Lin', 'Alignment & Suspension Tech', '555-0208', 54000.00);

-- Seed Data: 10 Cars
INSERT INTO Car (vin, manufacturer, model, year, color, customer_id) VALUES
('1HGCR2F83HA000001', 'Honda', 'Accord', 2017, 'Silver', 1),
('1FA6P8CF5H5100002', 'Ford', 'Mustang GT', 2019, 'Red', 2),
('WAUZZZ8K9FA000003', 'Audi', 'A4 Quattro', 2021, 'Black', 3),
('4T1B11HK5JU000004', 'Toyota', 'Camry SE', 2022, 'Midnight Blue', 4),
('5UXKR0C52K0000005', 'BMW', 'X5 xDrive40i', 2020, 'Alpine White', 5),
('5YJ3E1EA7KF000006', 'Tesla', 'Model 3 Long Range', 2023, 'Pearl White', 6),
('1GC4YNEY6MF000007', 'Chevrolet', 'Silverado 1500', 2018, 'Shadow Gray', 7),
('JF2SJAEC1LH000008', 'Subaru', 'Outback Limited', 2021, 'Autumn Green', 8),
('KM8J33D24NU000009', 'Hyundai', 'Tucson SEL', 2022, 'Titan Gray', 9),
('W1KWG8DB2MR000010', 'Mercedes-Benz', 'C300 4MATIC', 2020, 'Obsidian Black', 10);

-- Seed Data: 6 Inventory Parts
INSERT INTO Part (part_name, part_number, unit_price, stock_quantity, min_stock_alert) VALUES
('Full Synthetic Engine Oil 5W-30 (1 Qt)', 'OIL-5W30-QT', 8.99, 45, 10),
('Premium Oil Filter', 'FLT-OIL-101', 12.50, 25, 5),
('Front Ceramic Brake Pad Set', 'BRK-PAD-F200', 49.99, 14, 5),
('Iridium Spark Plug Pack (4x)', 'SPK-PLG-IR4', 29.95, 18, 5),
('Heavy-Duty AGM Battery 12V', 'BAT-AGM-12V', 159.99, 8, 3),
('Vented Front Brake Rotor Pair', 'RTR-BRK-F50', 89.50, 12, 4);

-- Seed Data: 12 Service Jobs across different dates
INSERT INTO ServiceJob (car_id, employee_id, job_date, description, total_cost, status) VALUES
(1, 1, '2026-07-02', 'Synthetic Oil Change and Air Filter Replacement', 149.99, 'Completed'),
(2, 2, '2026-07-05', 'Brake Pad and Rotor Replacement', 320.00, 'Completed'),
(3, 3, '2026-07-10', 'Transmission Fluid Flush & Tire Rotation', 310.50, 'Completed'),
(4, 4, '2026-07-12', '30,000 Mile Factory Maintenance Service', 389.00, 'Completed'),
(5, 5, '2026-07-15', 'High-Voltage Battery Calibration and Firmware Upgrade', 210.00, 'Completed'),
(6, 6, '2026-07-18', 'Front Suspension Strut Replacement & Wheel Alignment', 540.00, 'Completed'),
(7, 1, '2026-07-22', 'Full Synthetic Oil Change and Inspection', 95.00, 'Completed'),
(8, 2, '2026-07-25', 'AGM Battery Replacement & Alternator Test', 249.99, 'Completed'),
(9, 3, '2026-07-28', 'Spark Plug Replacement & Fuel System Cleaning', 185.00, 'Completed'),
(10, 4, '2026-07-29', 'Engine Diagnostics - Check Engine Light Inspection', 120.00, 'In Progress'),
(1, 5, '2026-07-30', 'A/C Recharge and Cabin Air Filter', 160.00, 'In Progress'),
(2, 1, '2026-07-30', 'Rear Brake Pad Service & Caliper Lubrication', 220.00, 'Pending');

-- Link sample parts to completed jobs
INSERT INTO ServiceJobPart (job_id, part_id, quantity_used, unit_price) VALUES
(1, 1, 5, 8.99),
(1, 2, 1, 12.50),
(2, 3, 1, 49.99),
(2, 6, 1, 89.50),
(7, 1, 5, 8.99),
(7, 2, 1, 12.50),
(8, 5, 1, 159.99),
(9, 4, 1, 29.95);
