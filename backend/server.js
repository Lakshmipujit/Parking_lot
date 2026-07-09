require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Fixed slot limits
const LIMITS = {
    bike: 5,
    car: 5,
    truck: 2
};

const VEHICLE_TYPES = Object.keys(LIMITS);


// -----------------------------------------------------
// Helper Functions
// -----------------------------------------------------

function calculateFare(entryTime, exitTime) {
    const ms = new Date(exitTime) - new Date(entryTime);

    const hours = Math.max(
        1,
        Math.ceil(ms / (1000 * 60 * 60))
    );

    let amount;

    if (hours <= 3) {
        amount = 30;
    }
    else if (hours <= 6) {
        amount = 85;
    }
    else {
        amount = 120;
    }

    return { hours, amount };
}


async function nextTicketId(conn) {

    const [rows] = await conn.query(
        `SELECT ticket_id 
         FROM tickets 
         ORDER BY id DESC 
         LIMIT 1`
    );


    if (rows.length === 0) {
        return "TKT-1001";
    }


    const lastNumber = parseInt(
        rows[0].ticket_id.split('-')[1]
    );


    return `TKT-${lastNumber + 1}`;
}


function toIso(dt) {
    return new Date(dt).toISOString();
}



// -----------------------------------------------------
// HOME ROUTE (Fixes Cannot GET /)
// -----------------------------------------------------

app.get('/', (req, res) => {
    res.send("Parking Lot API is running 🚗");
});



// -----------------------------------------------------
// GET AVAILABLE SLOTS
// -----------------------------------------------------

app.get('/api/slots', async (req, res) => {

    try {

        const [rows] = await pool.query(
            `SELECT vehicle_type,
            COUNT(*) AS occupied
            FROM tickets
            WHERE status='parked'
            GROUP BY vehicle_type`
        );


        const occupied = {
            bike: 0,
            car: 0,
            truck: 0
        };


        rows.forEach(row => {
            occupied[row.vehicle_type] = Number(row.occupied);
        });


        const result = {};


        VEHICLE_TYPES.forEach(type => {

            result[type] = {
                total: LIMITS[type],
                available:
                    LIMITS[type] - occupied[type]
            };

        });


        res.json(result);


    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});




// -----------------------------------------------------
// PARK VEHICLE
// -----------------------------------------------------

app.post('/api/park', async (req, res) => {

    try {


        const vehicleNumber =
            (req.body.vehicleNumber || '').trim();


        const vehicleType =
            (req.body.vehicleType || '')
                .trim()
                .toLowerCase();



        if (!vehicleNumber || !vehicleType) {

            return res.status(400).json({
                success: false,
                message: "Vehicle number and type required"
            });

        }



        if (!VEHICLE_TYPES.includes(vehicleType)) {

            return res.status(400).json({
                success: false,
                message: "Invalid vehicle type"
            });

        }



        const conn = await pool.getConnection();


        try {


            await conn.beginTransaction();



            const [existing] = await conn.query(

                `SELECT id FROM tickets 
WHERE vehicle_number=? 
AND status='parked'`,

                [vehicleNumber]

            );



            if (existing.length) {

                await conn.rollback();

                return res.status(400).json({

                    success: false,

                    message: "Vehicle already parked"

                });

            }



            const [count] = await conn.query(

                `SELECT COUNT(*) AS occupied
FROM tickets
WHERE vehicle_type=?
AND status='parked'
FOR UPDATE`,

                [vehicleType]

            );



            if (Number(count[0].occupied) >= LIMITS[vehicleType]) {


                await conn.rollback();


                return res.status(409).json({

                    success: false,

                    message: "Parking Full"

                });

            }



            const ticketId =
                await nextTicketId(conn);



            const entryTime = new Date();



            await conn.query(

                `INSERT INTO tickets
(ticket_id,
vehicle_number,
vehicle_type,
entry_time,
status)

VALUES(?,?,?,?, 'parked')`,

                [
                    ticketId,
                    vehicleNumber,
                    vehicleType,
                    entryTime
                ]

            );



            await conn.commit();



            res.status(201).json({

                success: true,

                ticket: {

                    ticketId,
                    vehicleNumber,
                    vehicleType,
                    entryTime: toIso(entryTime)

                }

            });


        }

        finally {

            conn.release();

        }


    }
    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: "Server error"

        });

    }


});





// -----------------------------------------------------
// EXIT VEHICLE
// -----------------------------------------------------

app.post('/api/exit', async (req, res) => {

    try {


        const ticketId =
            (req.body.ticketId || '').trim();


        const vehicleNumber =
            (req.body.vehicleNumber || '').trim();



        if (!ticketId && !vehicleNumber) {

            return res.status(400).json({

                success: false,

                message: "Ticket ID or vehicle number required"

            });

        }



        let query;

        let value;



        if (ticketId) {

            query =
                `SELECT * FROM tickets 
WHERE ticket_id=? 
AND status='parked'`;

            value = ticketId;


        }
        else {


            query =
                `SELECT * FROM tickets
WHERE vehicle_number=?
AND status='parked'`;

            value = vehicleNumber;


        }



        const [rows] = await pool.query(
            query,
            [value]
        );



        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Ticket not found"

            });

        }



        const ticket = rows[0];



        const exitTime = new Date();



        const { hours, amount } = calculateFare(
            ticket.entry_time,
            exitTime
        );



        await pool.query(

            `UPDATE tickets

SET exit_time=?,
amount=?,
status='exited'

WHERE id=?`,

            [
                exitTime,
                amount,
                ticket.id
            ]

        );



        res.json({

            success: true,

            receipt: {

                ticketId: ticket.ticket_id,

                vehicleNumber: ticket.vehicle_number,

                entryTime: toIso(ticket.entry_time),

                exitTime: toIso(exitTime),

                durationHours: hours,

                amount

            }

        });



    }
    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: "Server error"

        });

    }

});





// -----------------------------------------------------
// CURRENT PARKED VEHICLES
// -----------------------------------------------------

app.get('/api/parked', async (req, res) => {


    try {


        const [rows] = await pool.query(

            `SELECT 
ticket_id,
vehicle_number,
vehicle_type,
entry_time

FROM tickets

WHERE status='parked'

ORDER BY entry_time ASC`

        );



        res.json(

            rows.map(row => ({

                ticketId: row.ticket_id,

                vehicleNumber: row.vehicle_number,

                vehicleType: row.vehicle_type,

                entryTime: toIso(row.entry_time)

            }))

        );



    }
    catch (err) {

        console.log(err);


        res.status(500).json({

            success: false,

            message: "Server error"

        });


    }


});




// -----------------------------------------------------
// START SERVER
// -----------------------------------------------------

const PORT = process.env.PORT || 4000;


app.listen(PORT, () => {

    console.log(
        `Parking Lot API running at http://localhost:${PORT}`
    );

});