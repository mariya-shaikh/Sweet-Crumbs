require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || "sweet-crumbs-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 1000
    }
}));

// MySQL Connection
const dbConfig = process.env.MYSQL_URL
    ? process.env.MYSQL_URL
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    };

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("MySQL Database Connected Successfully!");
    }
});

// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "Sweet Crumbs server is running" });
});

// Admin Authentication Middleware
function requireAdmin(req, res, next) {
    if (req.session.isAdmin === true) {
        return next();
    }

    return res.status(401).json({
        message: "Please login as admin."
    });
}

// CUSTOMER ORDER API
app.post("/api/orders", async (req, res) => {
    const { name, phone, address, payment, items } = req.body;

    if (!name || !phone || !address || !payment ||
        !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "Invalid order details."
        });
    }

    try {
        await db.promise().beginTransaction();

        for (const item of items) {
            await db.promise().query(
                `INSERT INTO orders
                (customer_name, mobile, address, cake_name,
                price, payment_method)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [name, phone, address, item.name, item.price, payment]
            );
        }

        await db.promise().commit();

        res.json({
            message: "Order saved successfully!"
        });

    } catch (err) {
        await db.promise().rollback();

        console.log("Order error:", err.message);

        res.status(500).json({
            message: "Could not save order."
        });
    }
});

// CUSTOMER FEEDBACK API
app.post("/api/feedback", (req, res) => {
    const { name, rating, message } = req.body;

    if (!name || !rating || !message) {
        return res.status(400).json({
            message: "Please fill all fields."
        });
    }

    db.query(
        `INSERT INTO feedback
        (customer_name, rating, message)
        VALUES (?, ?, ?)`,
        [name, rating, message],
        (err) => {
            if (err) {
                console.log("Feedback error:", err.message);

                return res.status(500).json({
                    message: "Could not save feedback."
                });
            }

            res.json({
                message: "Feedback saved successfully!"
            });
        }
    );
});

// ADMIN LOGIN API
app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME;

    if (!adminUsername || !adminPassword) {
        return res.status(500).json({
            success: false,
            message: "Admin credentials are not configured."
        });
    }

    if (
        username === adminUsername &&
        password === adminPassword
    ) {
        req.session.isAdmin = true;

        return res.json({
            success: true,
            message: "Admin login successful!"
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid username or password."
    });
});

// CHECK ADMIN LOGIN
app.get("/api/admin/check", (req, res) => {
    res.json({
        loggedIn: req.session.isAdmin === true
    });
});

// ADMIN LOGOUT
app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            message: "Logged out successfully."
        });
    });
});

// GET ALL ORDERS
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT id, customer_name, mobile, cake_name,
            price, payment_method, order_status
            FROM orders ORDER BY id DESC`
        );

        res.json(rows);

    } catch (err) {
        console.log("Orders error:", err.message);

        res.status(500).json({
            message: "Could not load orders."
        });
    }
});

// GET ALL FEEDBACK
app.get("/api/admin/feedback", requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT id, customer_name, rating, message
            FROM feedback ORDER BY id DESC`
        );

        res.json(rows);

    } catch (err) {
        console.log("Feedback error:", err.message);

        res.status(500).json({
            message: "Could not load feedback."
        });
    }
});

// UPDATE ORDER STATUS
app.put("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;

    const allowed = [
        "Pending",
        "Confirmed",
        "Preparing",
        "Delivered"
    ];

    if (!allowed.includes(status)) {
        return res.status(400).json({
            message: "Invalid status."
        });
    }

    try {
        const [result] = await db.promise().query(
            "UPDATE orders SET order_status = ? WHERE id = ?",
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        res.json({
            message: "Order status updated successfully!"
        });

    } catch (err) {
        console.log("Status error:", err.message);

        res.status(500).json({
            message: "Could not update order status."
        });
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
