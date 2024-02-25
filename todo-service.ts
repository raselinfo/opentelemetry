import start from "./tracer";
const meter = start("todo-service");

import opentelemetry from "@opentelemetry/api";

import express from "express";
import axios from "axios";
const app = express();

import Redis from "ioredis";
import { api } from "@opentelemetry/sdk-node";
const redis = new Redis({ host: "redis" });

// Create a histogram metric to record the duration of each request to the service.
const calls = meter.createHistogram("http-calls");

// This middleware will record the duration of each request to the service and store it in a histogram metric.
app.use((req, res, next) => {
  const startTime = Date.now();
  req.on("end", () => {
    console.log("Request ended ❌");
    const endTime = Date.now();
    calls.record(endTime - startTime, {
      route: req.route?.path,
      status: res.statusCode,
      method: req.method,
    });
  });
  next();
});

const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

app.get("/todos", async (req, res) => {
  const user = await axios.get("http://auth:8080/auth");

  const todoKeys = await redis.keys("todo:*");

  const todos: any = [];

  for (let i = 0; i < todoKeys.length; i++) {
    const todoItem = await redis.get(todoKeys[i]);
    if (todoItem) {
      todos.push(JSON.parse(todoItem));
    }
  }

  // This code will add a delay to the response if the query parameter "slow" is present.
  if (req.query["slow"]) {
    await sleep(1000);
  }

  // This code will throw an error if the query parameter "fail" is present.
  if (req.query["fail"]) {
    try {
      throw new Error("Really bad error!");
    } catch (e: any) {
      const activeSpan = api.trace.getSpan(api.context.active());
      
      console.error("😢😢😢😢 todo-service", activeSpan);

      // This code will record the error in the active span and log the error message and trace context.
      activeSpan?.recordException(e);
      console.error("Really bad error!", {
        spanId: activeSpan?.spanContext().spanId,
        traceId: activeSpan?.spanContext().traceId,
        traceFlag: activeSpan?.spanContext().traceFlags,
      });

      res.sendStatus(500);
      return;
    }
  }

  res.json({ todos, user: user.data });
});

app.listen(8080, () => {
  console.log("service is up and running!");
});

/**
 * Initializes the application by setting default items in Redis.
 *
 * This function starts an active span named "Set default items" using the OpenTelemetry tracer named "init".
 * It sets default todo items in Redis using the Redis client instance.
 *
 * @returns {Promise<void>} A promise that resolves when the default items have been set in Redis.
 */
async function init() {
  // This code will start an active span named "Set default items" using the OpenTelemetry tracer named "init".
  opentelemetry.trace
    .getTracer("init")
    .startActiveSpan("Set default items", async (span) => {
      // This code will set default todo items in Redis using the Redis client instance.
      await Promise.all([
        redis.set(
          "todo:1",
          JSON.stringify({ name: "Install OpenTelemetry SDK" })
        ),
        redis.set(
          "todo:2",
          JSON.stringify({ name: "Deploy OpenTelemetry Collector" })
        ),
        redis.set(
          "todo:3",
          JSON.stringify({ name: "Configure sampling rule" })
        ),
        redis.set(
          "todo:4",
          JSON.stringify({ name: "You are OpenTelemetry master!" })
        ),
      ]);

      // This code will end the active span.
      span.end();
    });
}
init();
