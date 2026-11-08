const mysql = require("mysql2/promise");

async function getConnection() {
    if (process.env.MYSQL_URL) {
        return mysql.createConnection(process.env.MYSQL_URL);
    }

    const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length) {
        throw new Error("Missing database environment variables: " + missing.join(", "));
    }

    return mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306)
    });
}

module.exports = { getConnection };
