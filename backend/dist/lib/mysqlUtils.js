export const withConnection = async (pool, callback) => {
    const connection = await pool.getConnection();
    try {
        return await callback(connection);
    }
    finally {
        connection.release();
    }
};
export const withTransaction = async (pool, callback) => withConnection(pool, async (connection) => {
    await connection.beginTransaction();
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
});
export const selectOne = async (connection, query, values = []) => {
    const [rows] = await connection.query(query, values);
    return rows[0];
};
export const selectAll = async (connection, query, values = []) => {
    const [rows] = await connection.query(query, values);
    return rows;
};
export const executeResult = async (connection, query, values = []) => {
    const [result] = await connection.execute(query, values);
    return result;
};
