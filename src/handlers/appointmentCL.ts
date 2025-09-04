import { SQSEvent } from 'aws-lambda';
import { AppointmentService } from '../services/appointmentService';

const service = new AppointmentService();

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const appointment = JSON.parse(record.body);
    await service.processCountry(appointment, 'PE');
  }
};
