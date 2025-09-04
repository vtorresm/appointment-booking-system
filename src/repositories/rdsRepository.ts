import mysql from 'mysql2/promise';
import { AppointmentRequest } from '../models/appointment';

export class RdsRepository {
  private async getConnection() {
    return mysql.createConnection({
      host: process.env.RDS_HOST,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
    });
  }

  async save(
    appointment: AppointmentRequest,
    country: 'PE' | 'CL'
  ): Promise<void> {
    const connection = await this.getConnection();
    try {
      const table = country === 'PE' ? 'appointments_pe' : 'appointments_cl';
      await connection.execute(
        `INSERT INTO ${table} (insured_id, schedule_id, country_iso, created_at) VALUES (?, ?, ?, ?)`,
        [
          appointment.insuredId,
          appointment.scheduleId,
          appointment.countryISO,
          new Date().toISOString(),
        ]
      );
    } finally {
      connection.end();
    }
  }
}
