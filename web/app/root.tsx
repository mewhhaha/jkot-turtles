import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { MetaFunction, LinksFunction } from "@remix-run/cloudflare";
import styles from "./unocss.css";
import reset from "@unocss/reset/tailwind.css";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: reset },
    { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
  ];
};

export const meta: MetaFunction = () => {
  return {
    title: "Turtles Board Game",
    description: "This is the Turtles Board Game",
  };
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
