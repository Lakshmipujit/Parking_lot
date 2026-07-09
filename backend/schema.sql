-- Parking Lot System — schema
-- MySQL syntax (works with MySQL 5.7+/8.0). For PostgreSQL, see the note at the bottom.
-- Parking Lot System Database Schema

CREATE DATABASE IF NOT EXISTS parking;

USE parking;


-- Remove old table if you want a fresh start
DROP TABLE IF EXISTS tickets;


-- Create tickets table
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



-- Indexes for faster searching

CREATE INDEX idx_vehicle_status
ON tickets(vehicle_number, status);


CREATE INDEX idx_type_status
ON tickets(vehicle_type, status);
-------------------------------------------------------
-- PostgreSQL equivalent, if you'd rather use pg instead of mysql2:
--
-- CREATE TYPE vehicle_type_enum AS ENUM ('bike', 'car', 'truck');
-- CREATE TYPE ticket_status_enum AS ENUM ('parked', 'exited');
--
-- CREATE TABLE tickets (
--   id              SERIAL PRIMARY KEY,
--   ticket_id       VARCHAR(20) UNIQUE NOT NULL,
--   vehicle_number  VARCHAR(20) NOT NULL,
--   vehicle_type    vehicle_type_enum NOT NULL,
--   entry_time      TIMESTAMP NOT NULL,
--   exit_time       TIMESTAMP DEFAULT NULL,
--   amount          DECIMAL(6,2) DEFAULT NULL,
--   status          ticket_status_enum NOT NULL DEFAULT 'parked'
-- );
-- CREATE INDEX idx_vehicle_status ON tickets (vehicle_number, status);
-- CREATE INDEX idx_type_status ON tickets (vehicle_type, status);