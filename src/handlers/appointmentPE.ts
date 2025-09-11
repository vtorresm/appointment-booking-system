import { SQSEvent, Context } from 'aws-lambda';
import { AppointmentService } from '../services/appointmentService';
import { Appointment } from '../models/appointment';

const service = new AppointmentService();

export const handler = async (event: SQSEvent, context: Context) => {
  try {
    // Establecer un tiempo de espera ligeramente menor que el timeout de Lambda
    const timeoutMS = context.getRemainingTimeInMillis() - 1000;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Function timeout')), timeoutMS)
    );

    const processEvent = async () => {
      for (const record of event.Records) {
        try {
          // Los mensajes de SNS llegan envueltos en una estructura cuando pasan por SQS
          const snsMessage = JSON.parse(record.body);
          const message = JSON.parse(snsMessage.Message);
          console.log('Mensaje a procesar:', JSON.stringify(message));
          
          // Validar campos requeridos
          if (!message.id || !message.insuredId || !message.countryISO || !message.createdAt) {
            console.error('Campos requeridos faltantes:', message);
            continue;
          }

          // Si el mensaje viene con date y time o scheduleId, determinar el scheduleId final
          let scheduleId: number;
          
          if (message.scheduleId) {
            const parsedScheduleId = Number(message.scheduleId);
            if (isNaN(parsedScheduleId)) {
              console.error('scheduleId inválido:', message.scheduleId);
              continue;
            }
            scheduleId = parsedScheduleId;
          } else if (message.date && message.time) {
            // TODO: Implementar conversión real de date+time a scheduleId
            scheduleId = 1;
            console.log(`Convertido date=${message.date} y time=${message.time} a scheduleId=${scheduleId}`);
          } else {
            console.error('No se puede determinar el scheduleId. Faltan date+time o scheduleId:', message);
            continue;
          }

          // Validar formato de insuredId
          if (!/^\d{5}$/.test(message.insuredId)) {
            console.error('Formato inválido de insuredId:', message.insuredId);
            continue;
          }

          // Validar countryISO
          if (!['PE', 'CL'].includes(message.countryISO)) {
            console.error('País inválido:', message.countryISO);
            continue;
          }

          const appointmentToProcess: Appointment = {
            id: message.id,
            insuredId: message.insuredId,
            scheduleId: scheduleId,
            countryISO: message.countryISO,
            status: message.status || 'pending',
            createdAt: message.createdAt
          };

          await service.processCountry(appointmentToProcess, 'PE');
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      }
    };

    // Esperar a que termine el procesamiento o se alcance el timeout
    await Promise.race([processEvent(), timeout]);
  } catch (error) {
    console.error('Error en handler:', error);
    throw error;
  } finally {
    // No cerramos el pool aquí. RdsRepository.end() debe llamarse solo en shutdown controlado.
    // Dejar recursos abiertos para reutilización entre invocaciones y evitar errores "Pool is closed".
  }
};
