import { Router, Request as RouterRequest } from "itty-router";
import { init } from "./helpers";
import { TurtleGame } from "./turtle-game";
import { Env } from "./types";
export * from "./turtle-game";

const router = Router();

router.get("/:id/:name", async (request: Request & RouterRequest, env: Env) => {
  const id = request.params?.id;
  const name = request.params?.name;

  if (!id) return new Response("expected id", { status: 422 });
  if (!name) return new Response("expected name", { status: 422 });

  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("expected websocket", { status: 400 });
  }

  const durableObject = init<TurtleGame>(env.TURTLE_GAME_DO).get(id);

  return await durableObject.call(request, "connect", decodeURIComponent(name));
});

export default {
  fetch: router.handle,
};
