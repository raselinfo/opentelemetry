import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";

import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";

import {
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
  CompositePropagator,
} from "@opentelemetry/core";

const { CustomSampler } = require("./CustomSampler");

const start = (serviceName: string) => {
  // OpenTelemetry Metrics Configuration With Prometheus Exporter
  const { endpoint, port } = PrometheusExporter.DEFAULT_OPTIONS;
  console.log(" 😊😊😊😊😊 Prometheus Exporter", endpoint, port);
  const exporter = new PrometheusExporter(
    {
      // endpoint: "http://localhost:9464/metrics"
    },
    () => {
      console.log(
        `prometheus scrape endpoint: http://localhost:${port}${endpoint}`
      );
    }
  );

  const meterProvider = new MeterProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });
  // Register the metric exporter
  meterProvider.addMetricReader(exporter);
  // Get the meter instance from the meter provider
  const meter = meterProvider.getMeter("my-service-meter");

  // OpenTelemetry Tracing Configuration
  const traceExporter = new OTLPTraceExporter({
    url: "http://jaeger:4318/v1/traces",
  });

  // OpenTelemetry SDK Configuration
  const sdk = new NodeSDK({
    traceExporter, // Tracing Exporter
    serviceName: serviceName, // Service Name

    // Instrumentation Configuration
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
        "@opentelemetry/instrumentation-http": {
          headersToSpanAttributes: {
            client: {
              requestHeaders: [
                "x-request-id",
                "tracestate",
                "traceparent",
                "baggage",
              ],
            },
            server: {
              requestHeaders: [
                "x-request-id",
                "tracestate",
                "traceparent",
                "baggage",
              ],
            },
          },
        },
      }),
    ], // Auto Instrumentations for Node.js it will automatically instrument the application.
    // what is instrumentations? Instrumentation is the process of adding code to your application to collect data about its performance and operation.

    // Resource Configuration
    autoDetectResources: true,
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      "team.owner": "core-team",
      deployment: "4",
      name: "Rasel",
    }),

    // Sampler Configuration
    sampler: new ParentBasedSampler({
      // root: new TraceIdRatioBasedSampler(0.5) // Sample 50% of the traces. it will sample some unnecessary traces like prometheus scrape that we don't want to sample that's why we will use CustomSampler
      root: new CustomSampler(),
    }),

    // Propagator Configuration
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
  });

  sdk.start();
  return meter;
};

export default start;
