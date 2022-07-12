import type { ClientMessage } from "durable-objects";

export const clientMessage = <M extends ClientMessage>(message: M) =>
  JSON.stringify(message);
