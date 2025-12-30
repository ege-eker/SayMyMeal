import buildApp from "./app";

const app = buildApp();

const start = async () => {
    try {
        const address = await app.listen({ port: 4000, host: "0.0.0.0"});
        console.log(`🚀 Server running on ${address}`);
        console.log(`📖 Swagger docs: ${address}/docs`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();