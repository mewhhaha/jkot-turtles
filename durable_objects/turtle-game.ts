import { createInit, createSessions, DurableObjectTemplate } from "./helpers";

export class TurtleGame extends DurableObjectTemplate {
  static init = createInit<TurtleGame>;
  sessions: ReturnType<typeof createSessions>;

  constructor(_state: DurableObjectState) {
    super();
    this.sessions = createSessions();
  }

  async websocket() {
    return this.sessions.connect({
      onMessage: (websocket, message: MessageEvent) => {
        this.sessions.broadcast(websocket, message.data as string);
      },
    });
  }
}
