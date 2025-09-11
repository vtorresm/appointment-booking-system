import { SQSEvent } from 'aws-lambda';
import { AppointmentService } from '../services/appointmentService';

const service = new AppointmentService();

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      console.log('Mensaje SQS recibido:', record.body);
      const snsMessage = JSON.parse(record.body);
      console.log('Mensaje SNS parseado:', snsMessage);
      const appointment = JSON.parse(snsMessage.Message);
      console.log('Appointment parseado:', JSON.stringify(appointment));
      await service.processCountry(appointment, 'CL');
      console.log('Cita procesada correctamente');
    }
  } catch (error) {
    console.error('Error en el procesamiento:', error);
    throw error;
  }
};
