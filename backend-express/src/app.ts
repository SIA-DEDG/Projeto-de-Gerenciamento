import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';
import { snakeCaseResponse } from './middleware/snake-case.middleware';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import projectsRoutes from './modules/projects/projects.routes';
import absencesRoutes from './modules/absences/absences.routes';
import eventsRoutes from './modules/events/events.routes';
import feedbackRoutes from './modules/feedback/feedback.routes';
import logsRoutes from './modules/logs/logs.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(snakeCaseResponse);

// Swagger UI em /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/logs', logsRoutes);

app.use(errorHandler);

export default app;
