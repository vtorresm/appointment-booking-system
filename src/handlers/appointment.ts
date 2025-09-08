import { APIGatewayProxyHandler, SQSHandler } from 'aws-lambda';
import { AppointmentService } from '../services/appointmentService';

const service = new AppointmentService();

export const postHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const request = JSON.parse(event.body!);
    const result = await service.register(request);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error: any) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }
};

export const getHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const insuredId = event.pathParameters!.insuredId!;
    const appointments = await service.listByInsuredId(insuredId);
    return { statusCode: 200, body: JSON.stringify(appointments) };
  } catch (error: any) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }
};

export const confirmHandler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { id } = JSON.parse(record.body);
    await service.confirm(id);
  }
};
