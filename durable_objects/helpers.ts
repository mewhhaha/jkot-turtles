export type External<A extends Record<any, any>> = Extract<
  {
    [Key in keyof A]: A[Key] extends (...args: any[]) => Promise<Response>
      ? Key
      : never;
  }[Exclude<keyof A, keyof DurableObject>],
  string
>;

export const init = <ClassDO extends Record<any, any>>(
  ns: DurableObjectNamespace
) => {
  return {
    get: (name: string | DurableObjectId) => {
      const stub =
        typeof name === "string" ? ns.get(ns.idFromName(name)) : ns.get(name);

      return {
        call: <Method extends External<ClassDO>>(
          request: Request,
          method: Method,
          ...args: Parameters<ClassDO[Method]>
        ) => {
          const encodedArgs = encodeURIComponent(JSON.stringify(args));
          return stub.fetch(
            new Request(`https://do/${method}/${encodedArgs}`, {
              method: request.method,
              headers: request.headers,
              cf: request.cf,
            })
          );
        },
      };
    },
  };
};

export const createSessions = () => {
  let sessions: WebSocket[] = [];
  return {
    disconnect: (websocket: WebSocket) => {
      sessions = sessions.filter((w) => w !== websocket);
      websocket.close();
    },

    connect: async ({
      onConnect,
      onMessage,
    }: {
      onConnect?: (websocket: WebSocket) => Promise<void> | void;
      onMessage: (websocket: WebSocket, message: MessageEvent) => void;
    }) => {
      const pair = new WebSocketPair();
      const websocket = pair[1];

      websocket.accept();

      sessions.push(websocket);

      await onConnect?.(pair[1]);

      websocket.addEventListener("message", (msg) => onMessage(pair[1], msg));

      return new Response(null, { status: 101, webSocket: pair[0] });
    },

    broadcast: (message: string) => {
      sessions = sessions.filter((session) => {
        try {
          session.send(message);
          return true;
        } catch (_err) {
          return false;
        }
      });
    },
  };
};

export class DurableObjectTemplate implements DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const [method, encodedArgs] = url.pathname.split("/").slice(1);
    const args = JSON.parse(decodeURIComponent(encodedArgs));

    // @ts-ignore Here we go!
    return await this[method](...args);
  }
}
