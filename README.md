# 🚗 Parking Lot System

A full-stack parking lot management app — vehicles park, get a ticket, and are charged a fare based on how long they stayed. Built with Node.js/Express, MySQL, and React.

![Node](https://img.shields.io/badge/Node.js-Express-green)
![React](https://img.shields.io/badge/Frontend-React-blue)
![MySQL](https://img.shields.io/badge/Database-MySQL-orange)

## Features

- 🎫 Park a vehicle by number and type, receive a ticket
- 🚪 Exit a vehicle using either the ticket ID or vehicle number
- 📊 Live slot availability per vehicle type
- ⏱️ Entry/exit time tracking, stored in MySQL
- 💰 Automatic fare calculation on exit (server-side, tamper-proof)
- 🚫 "Parking Full" handling when a vehicle type is at capacity

## Slot Limits

| Type  | Slots |
|-------|-------|
| Bike  | 5     |
| Car   | 5     |
| Truck | 2     |

## Pricing

| Duration              | Fare  |
|------------------------|-------|
| Up to 3 hours           | ₹30   |
| More than 3, up to 6    | ₹85   |
| More than 6 hours       | ₹120  |

Stay time is rounded **up** to the nearest whole hour — any part of an hour counts as a full hour.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** MySQL
- **Frontend:** React (Vite)

## Project Structure
