import { DynamoRepository } from '../../repositories/dynamoRepository';
import { RdsRepository } from '../../repositories/rdsRepository';
import { AppointmentService } from '../../services/appointmentService';

jest.mock('../../repositories/dynamoRepository');
jest.mock('../../repositories/rdsRepository');

describe('AppointmentService', () => {
  const mockDynamo = DynamoRepository as jest.MockedClass<typeof DynamoRepository>;
  const mockRds = RdsRepository as jest.MockedClass<typeof RdsRepository>;
  const service = new AppointmentService();

  it('should register appointment', async () => {
    const request = { insuredId: '00001', scheduleId: 100, countryISO: 'PE' as const };
    mockDynamo.prototype.create.mockResolvedValue({ ...request, id: 'uuid', status: 'pending', createdAt: 'date', countryISO: request.countryISO });
    const result = await service.register(request);
    expect(result).toEqual({ message: 'Agendamiento en proceso' });
  });

  // Agrega más pruebas para processCountry, confirm, listByInsuredId...
});