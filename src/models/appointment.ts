export interface AppointmentRequest {
  insuredId: string;
  scheduleId?: number; // Optional porque puede venir date+time en su lugar
  date?: string;
  time?: string;  
  countryISO: 'PE' | 'CL';
}

export interface Appointment {
  id: string;
  insuredId: string;
  scheduleId: number;
  countryISO: 'PE' | 'CL';
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt?: string;
}
