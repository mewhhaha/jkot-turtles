import { Router } from "itty-router";
import { TurtleGame } from "./turtle-game";
import { Env } from "./types";
export * from "./turtle-game";

const router = Router();

router.all("/:id", (request, env: Env) => {
  const id = request.params?.id;

  if (!id) return new Response("expected id", { status: 422 });

  if ((request as Request).headers.get("Upgrade") !== "websocket") {
    return new Response("expected websocket", { status: 400 });
  }

  const durableObject = TurtleGame.init(env.TURTLE_GAME_DO).get(id);

  return durableObject.call("websocket");
});

export default {
  fetch: router.handle,
};
