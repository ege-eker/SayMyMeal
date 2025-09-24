import Fastify from 'fastify';
import db from './plugins/db';
import cors from './plugins/cors';
import swagger from './plugins/swagger';
import registerRoutes from "./modules";

const buildApp = () => {
    const app = Fastify({ logger: true });

    app.register(db);
    app.register(cors);
    app.register(swagger);

    app.register(registerRoutes);

    return app;
};

export default buildApp;