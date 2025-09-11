import { APIGatewayProxyHandler, SQSHandler } from 'aws-lambda';
import { AppointmentService } from '../services/appointmentService';

const service = new AppointmentService();

export const postHandler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('Evento recibido:', JSON.stringify(event));
    const request = JSON.parse(event.body!);
    console.log('Request parseado:', JSON.stringify(request));
    const result = await service.register(request);
    console.log('Resultado:', JSON.stringify(result));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error: any) {
    console.error('Error en postHandler:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Error interno del servidor' }) };
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
  try {
    console.log('Evento SQS recibido en confirmHandler:', JSON.stringify(event));
    for (const record of event.Records) {
      console.log('Procesando registro:', record.body);
      const { body } = JSON.parse(record.body);
      console.log('Body extraído:', JSON.stringify(body));
      await service.confirm(body.id);
      console.log('Cita confirmada con ID:', body.id);
    }
  } catch (error) {
    console.error('Error en confirmHandler:', error);
    throw error;
  }
};
