// src/middleware/index.ts
import PocketBase from "pocketbase";

import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware(
  async (
    { locals, request }: { locals: { pb: PocketBase }; request: Request },
    next: () => any
  ) => {
    console.log("AuthMiddleware");
    const pbUrl: string | undefined = process.env.PB_URL;
    if (!pbUrl) throw new Error("PB_URL environment variable is required");
    locals.pb = new PocketBase(pbUrl);

    // load the store data from the request cookie string
    locals.pb.authStore.loadFromCookie(request.headers.get("cookie") || "");
    console.log(locals.pb.authStore.isValid);
    try {
      // get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
      locals.pb.authStore.isValid &&
        (await locals.pb.collection("users").authRefresh());
    } catch (_) {
      // clear the auth store on failed refresh
      console.log("Failed to refresh auth token, clearing auth store");
      locals.pb.authStore.clear();
    }

    const response = await next();

    // send back the default 'pb_auth' cookie to the client with the latest store state
    response.headers.append("set-cookie", locals.pb.authStore.exportToCookie());

    return response;
  }
);
