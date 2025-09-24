import buildApp from "./app";

const app = buildApp();

const start = async () => {
    try {
        await app.listen({ port: 4000, host: "0.0.0.0"});
        console.log("🚀 Server running");
        console.log("📖 Swagger docs: http://.../docs");
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();