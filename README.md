# Backend de Agendamiento de Citas Médicas

## Configuración
- Desplegar: `npm run deploy`
- Local: `npm run offline`

## Endpoints
- POST /appointment: Body: { "insuredId": "00001", "scheduleId": 100, "countryISO": "PE" } → { "message": "Agendamiento en proceso" }
- GET /appointments/{insuredId}: Retorna lista de citas con estado.

## Flujo
1. POST llega al Lambda de appointment → Guarda en DynamoDB (pending) → Publica en SNS (por país).
2. SNS → SQS_PE/CL → Lambda de país → Guarda en RDS → EventBridge.
3. EventBridge → ConfirmationSQS → Lambda de confirmación de appointment → Actualiza DynamoDB a completed.

## Asunciones
- Tablas RDS: appointments_pe, appointments_cl.
- Variables de entorno en serverless.yml.

## Pruebas
- Pruebas unitarias: `npm test`