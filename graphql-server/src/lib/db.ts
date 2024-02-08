import mysql from 'mysql2/promise';

const promisePool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Convert JSON fields to objects
  typeCast: function (field, next) {
    if (field.type === 'JSON') {
      try {
        const jsonString = field.string();
        // Check if jsonString is not null or undefined before parsing
        return jsonString !== null && jsonString !== undefined
          ? JSON.parse(jsonString)
          : null;
      } catch (error) {
        // Handle JSON parsing error if needed
        console.error('Error parsing JSON field:', error);
        return null;
      }
    }
    return next();
  },
});

export default promisePool;
