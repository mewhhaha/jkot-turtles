import { Form } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { fields } from "../helpers/form";

export const action: ActionFunction = async ({ request }) => {
  const { id, name } = await fields(request, ["id", "name"]);

  return redirect(`/${id}/${name}`);
};

export default function Index() {
  return (
    <div className="flex h-[100vh] w-[100vw] flex-col">
      <header>
        <h1 className="w-full p-4 pt-12 text-center text-4xl font-extrabold tracking-wider">
          Turtles game
        </h1>
      </header>
      <main className="flex flex-grow justify-center pt-4">
        <Form className="flex flex-col space-y-4 px-10" method="post">
          <input
            name="id"
            placeholder="Type room name"
            required
            className="rounded-md border p-4 text-lg"
          />
          <input
            name="name"
            required
            placeholder="Type player name"
            className="rounded-md border p-4 text-lg"
          />

          <button
            type="submit"
            className="rounded-md border p-2 text-xl hover:bg-gray-50"
          >
            Join
          </button>
        </Form>
      </main>
    </div>
  );
}
