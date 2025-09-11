import mysql from 'mysql2/promise';
import { Appointment } from '../models/appointment';

export class RdsRepository {
  private pool!: mysql.Pool; // Using ! to tell TypeScript this will be initialized in constructor
  private static instance: RdsRepository | null = null;

  constructor() {
    if (RdsRepository.instance) {
      return RdsRepository.instance;
    }

    this.pool = mysql.createPool({
      host: process.env.RDS_HOST,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 2000
    });

    RdsRepository.instance = this;
  }

  async save(appointment: Appointment, country: 'PE' | 'CL'): Promise<void> {
    const { insuredId, scheduleId, countryISO, createdAt } = appointment;
    
    if (!insuredId || !scheduleId || !countryISO || !createdAt) {
      throw new Error(`Invalid appointment data. Required fields are missing: ${JSON.stringify({ 
        insuredId, 
        scheduleId, 
        countryISO, 
        createdAt 
      })}`);
    }

    if (!/^\d{5}$/.test(insuredId)) {
      throw new Error(`Invalid insuredId format: ${insuredId}`);
    }

    // Reinicializar el pool si está cerrado
    try {
      // Intentar una consulta simple para verificar la conexión
      await this.pool.execute('SELECT 1');
    } catch (error) {
      console.log('Error en la conexión, reinicializando pool...', error);
      this.pool = mysql.createPool({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USER,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DATABASE,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 2000
      });
    }

    let connection;
    try {
      connection = await this.pool.getConnection();
      const table = country === 'PE' ? 'appointments_pe' : 'appointments_cl';
      
      await connection.execute(
        `INSERT INTO ${table} (insured_id, schedule_id, country_iso, created_at) VALUES (?, ?, ?, ?)`,
        [insuredId, scheduleId, countryISO, new Date(createdAt)]
      );
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        console.error('Database connection timeout:', error);
        throw new Error('Database connection timeout');
      }
      console.error('Error saving appointment:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async end(): Promise<void> {
    if (RdsRepository.instance) {
      await RdsRepository.instance.pool.end();
      RdsRepository.instance = null;
    }
  }
}
