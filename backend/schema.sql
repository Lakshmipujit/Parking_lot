-- Parking Lot System Database Schema
-- MySQL version

DROP TABLE IF EXISTS tickets;

CREATE TABLE tickets (

    id INT AUTO_INCREMENT PRIMARY KEY,

    ticket_id VARCHAR(20) UNIQUE NOT NULL,

    vehicle_number VARCHAR(20) NOT NULL,

    vehicle_type ENUM('bike','car','truck') NOT NULL,

    entry_time DATETIME NOT NULL,

    exit_time DATETIME DEFAULT NULL,

    amount DECIMAL(6,2) DEFAULT NULL,

    status ENUM('parked','exited') NOT NULL DEFAULT 'parked'

);


CREATE INDEX idx_vehicle_status
ON tickets(vehicle_number, status);


CREATE INDEX idx_type_status
ON tickets(vehicle_type, status);