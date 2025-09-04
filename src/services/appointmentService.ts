import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { Appointment, AppointmentRequest } from '../models/appointment';
import { DynamoRepository } from '../repositories/dynamoRepository';
import { RdsRepository } from '../repositories/rdsRepository';

const snsClient = new SNSClient({});
const ebClient = new EventBridgeClient({});
const dynamoRepo = new DynamoRepository();
const rdsRepo = new RdsRepository();
const EVENT_BUS_NAME = process.env.EVENTBRIDGE_BUS!;

export class AppointmentService {
  async register(request: AppointmentRequest): Promise<{ message: string }> {
    // Validación
    if (!/^\d{5}$/.test(request.insuredId))
      throw new Error('Invalid insuredId');
    if (!['PE', 'CL'].includes(request.countryISO))
      throw new Error('Invalid countryISO');

    const appointment = await dynamoRepo.create(request);

    // Publicar en SNS
    const topicArn =
      request.countryISO === 'PE'
        ? process.env.SNS_TOPIC_PE!
        : process.env.SNS_TOPIC_CL!;
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(appointment),
      })
    );

    return { message: 'Agendamiento en proceso' };
  }

  async processCountry(
    appointment: Appointment,
    country: 'PE' | 'CL'
  ): Promise<void> {
    await rdsRepo.save(appointment, country);

    // Enviar a EventBridge
    await ebClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: `appointment.${country.toLowerCase()}`,
            DetailType: 'AppointmentConfirmed',
            Detail: JSON.stringify({ id: appointment.id }),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );
  }

  async confirm(id: string): Promise<void> {
    await dynamoRepo.updateStatus(id, 'completed');
  }

  async listByInsuredId(insuredId: string): Promise<Appointment[]> {
    return dynamoRepo.getByInsuredId(insuredId);
  }
}
