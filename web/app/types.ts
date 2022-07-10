import type { DataFunctionArgs } from "@remix-run/server-runtime";

export type CloudflareDataFunctionArgs = Omit<DataFunctionArgs, "context"> & {
  context: CloudflareContext;
};

export type CloudflareContext = {
  WORKER_URL: string;
};
