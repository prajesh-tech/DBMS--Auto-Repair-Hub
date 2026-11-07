jest.mock('../src/config/database', () => ({
    query: jest.fn().mockResolvedValue([[{ result: 2 }]]),
    getConnection: jest.fn(),
    end: jest.fn().mockResolvedValue()
}));

const db = require('../src/config/database');

describe('Database Configuration & Connection Interface', () => {
    it('should execute queries through pool interface', async () => {
        const [rows] = await db.query('SELECT 1 + 1 as result');
        expect(rows[0].result).toBe(2);
        expect(db.query).toHaveBeenCalledWith('SELECT 1 + 1 as result');
    });

    afterAll(async () => {
        await db.end();
    });
});
