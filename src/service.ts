import { createOpenSpecService } from "./service/http.js";

export { createOpenSpecService } from "./service/http.js";
export { runOpenSpec } from "./service/cli.js";

const port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
const token = process.env.OPENCHAMBER_SERVICE_TOKEN;
if (token && Number.isSafeInteger(port) && port > 0)
  createOpenSpecService(token).listen(port, "127.0.0.1");
