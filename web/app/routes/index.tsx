import { Form } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { fields } from "../helpers/form";

export const action: ActionFunction = async ({ request }) => {
  const { id, name } = await fields(request, ["id", "name"]);

  return redirect(`./${id}/${name}`);
};

export const Index = () => {
  return (
    <div className="h-[100vh] w-[100vw]">
      <header></header>
      <main className="flex items-center justify-center">
        <Form className="flex flex-col space-y-4" method="post">
          <input
            type="room_name"
            placeholder="Type room name"
            required
            className="rounded-md border text-lg"
          />
          <input
            type="player_name"
            required
            placeholder="Type player name"
            className="rounded-md border text-lg"
          />

          <button type="submit" className="rounded-md border text-xl">
            Join
          </button>
        </Form>
      </main>
    </div>
  );
};
