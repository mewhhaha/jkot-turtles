type FromKeys<Fields extends readonly [string, ...string[]]> = {
  [key in Fields[number]]: string;
};

export const fields = async <
  T extends string,
  Fields extends readonly [T, ...T[]]
>(
  request: Request,
  fields: Fields
): Promise<FromKeys<Fields>> => {
  const formData = await request.formData();
  // @ts-ignore Getting the fields out properly is a complex type
  return Object.fromEntries(
    fields.map((name) => [name, formData.get(name)?.toString() ?? ""])
  );
};
