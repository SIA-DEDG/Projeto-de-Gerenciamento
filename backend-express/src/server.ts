import './config/env'; // valida variáveis antes de tudo
import { env } from './config/env';
import app from './app';
import { prisma } from './lib/prisma';
import { ensureAdminExists } from './modules/auth/auth.service';

async function main() {
  await prisma.$connect();
  await ensureAdminExists();

  app.listen(env.PORT, () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${env.PORT}`);
    console.log(`📄 Swagger UI em  http://localhost:${env.PORT}/api/docs`);
  });
}

main().catch((err) => {
  console.error('❌ Falha ao iniciar o servidor:', err);
  process.exit(1);
});
