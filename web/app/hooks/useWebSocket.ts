import { useState, useEffect } from "react";

export type WebSocketStatus =
  | "idle"
  | "error"
  | "closed"
  | "open"
  | "reconnecting";

export type UseWebSocketOptions = { reconnect: boolean };

export const useWebSocket = (
  socketURL: string,
  { reconnect }: UseWebSocketOptions = { reconnect: true }
) => {
  const [status, setStatus] = useState<WebSocketStatus>("idle");
  const [socket, setSocket] = useState<WebSocket>(
    () => new WebSocket(socketURL)
  );

  useEffect(() => {
    try {
      const handleError = () => {
        setStatus("error");
      };

      const handleClose = () => {
        if (reconnect) {
          setStatus("reconnecting");
          setSocket(new WebSocket(socketURL));
        } else {
          setStatus("closed");
        }
      };

      const handleOpen = () => {
        setStatus("open");
      };

      socket.addEventListener("error", handleError);
      socket.addEventListener("close", handleClose);
      socket.addEventListener("open", handleOpen);

      return () => {
        socket.removeEventListener("error", handleError);
        socket.removeEventListener("close", handleClose);
        socket.removeEventListener("open", handleOpen);
        socket.close();
      };
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }, [reconnect, setSocket, socket, socketURL]);

  return [socket, status] as const;
};
