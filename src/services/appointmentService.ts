import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { Appointment, AppointmentRequest } from '../models/appointment';
import { DynamoRepository } from '../repositories/dynamoRepository';
import { RdsRepository } from '../repositories/rdsRepository';

const IS_OFFLINE = process.env.IS_OFFLINE === 'true';

const snsClient = new SNSClient({
  region: 'us-east-1',
  ...(IS_OFFLINE && {
    endpoint: 'http://localhost:4002',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  }),
});

const ebClient = new EventBridgeClient({
  region: 'us-east-1',
  ...(IS_OFFLINE && {
    endpoint: 'http://localhost:4002',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  }),
});

const dynamoRepo = new DynamoRepository();
const EVENT_BUS_NAME = process.env.EVENTBRIDGE_BUS || 'custom-event-bus';

export class AppointmentService {
  private rdsRepo: RdsRepository;

  constructor() {
    this.rdsRepo = new RdsRepository();
  }
  async register(request: AppointmentRequest): Promise<{ message: string }> {
    // Validación
    if (!/^\d{5}$/.test(request.insuredId))
      throw new Error('Invalid insuredId');
    if (!['PE', 'CL'].includes(request.countryISO))
      throw new Error('Invalid countryISO');

    console.log('Creando cita en DynamoDB...');
    const appointment = await dynamoRepo.create(request);
    console.log('Cita creada:', JSON.stringify(appointment));

    // Publicar en SNS
    const topicArn =
      request.countryISO === 'PE'
        ? process.env.SNS_TOPIC_PE!
        : process.env.SNS_TOPIC_CL!;
    console.log('Publicando en SNS:', topicArn);
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(appointment),
      })
    );
    console.log('Mensaje publicado en SNS');

    return { message: 'Agendamiento en proceso' };
  }

  async processCountry(
    appointment: Appointment,
    country: 'PE' | 'CL'
  ): Promise<void> {
    await this.rdsRepo.save(appointment, country);

    // Enviar a EventBridge
    console.log('Enviando evento a EventBridge...');
    try {
      await ebClient.send(
        new PutEventsCommand({
          Entries: [
            {
              Source: `appointment.${country.toLowerCase()}`,
              DetailType: 'AppointmentConfirmed',
              Detail: JSON.stringify({ 
                id: appointment.id,
                insuredId: appointment.insuredId,
                countryISO: appointment.countryISO,
                scheduleId: appointment.scheduleId,
                status: 'completed'
              }),
              EventBusName: EVENT_BUS_NAME,
            },
          ],
        })
      );
      console.log('Evento enviado a EventBridge correctamente');
    } catch (error) {
      console.error('Error al enviar evento a EventBridge:', error);
      throw error;
    }
  }

  async confirm(id: string): Promise<void> {
    await dynamoRepo.updateStatus(id, 'completed');
    console.log('Estado actualizado a completed para la cita:', id);
    
    // Verificar el nuevo estado
    const appointment = await dynamoRepo.getById(id);
    if (appointment) {
      console.log('Estado actual de la cita:', appointment.status);
      if (appointment.status !== 'completed') {
        throw new Error(`La actualización del estado falló para la cita ${id}`);
      }
    } else {
      throw new Error(`No se encontró la cita con ID ${id}`);
    }
  }

  async listByInsuredId(insuredId: string): Promise<Appointment[]> {
    return dynamoRepo.getByInsuredId(insuredId);
  }
}
