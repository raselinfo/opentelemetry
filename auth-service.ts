import start from "./tracer";
start("auth-service 🥰");

import express from "express";

import opentelemetry from "@opentelemetry/api";

const app = express();

app.get("/auth", (req, res) => {
  // Get the active Baggage. now it can get data from the context that's been set in the todo-service.ts. context => {user.plan: {value: "enterprise"}}
  const baggage = opentelemetry.propagation.getActiveBaggage();
  console.log("Baggage", baggage);

  res.json({ username: "Michael Haberman" });
  // add custom attributes to the active span
  const span = opentelemetry.trace.getActiveSpan();
  span?.setAttributes({
    info: JSON.stringify({
      username: "Rasel Hossain",
    }),
  });
});

app.listen(8080, () => {
  console.log("service is up and running!");
});
