const { getConnection } = require("./_db");

module.exports = async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        return res.status(405).json({
            message: "Method not allowed."
        });
    }

    let db;

    try {
        const body = typeof req.body === "string"
            ? JSON.parse(req.body || "{}")
            : (req.body || {});

        const { name, phone, address, payment, items } = body;

        if (!name || !phone || !address || !payment ||
            !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Invalid order details."
            });
        }

        db = await getConnection();
        await db.beginTransaction();

        for (const item of items) {
            await db.execute(
                `INSERT INTO orders
                (customer_name, mobile, address, cake_name, price, payment_method)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [name, phone, address, item.name, Number(item.price), payment]
            );
        }

        await db.commit();

        return res.status(200).json({
            message: "Order saved successfully!"
        });

    } catch (error) {
        if (db) {
            try {
                await db.rollback();
            } catch (_) {}
        }

        console.error("Order API error:", error);

        return res.status(500).json({
            message: "Could not save order. Check database connection."
        });

    } finally {
        if (db) {
            try {
                await db.end();
            } catch (_) {}
        }
    }
};
