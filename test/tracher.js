const { NodeSDK } = require("@opentelemetry/sdk-node");

const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-proto");

const start = (serviceName) => {
  const traceExporter = new OTLPTraceExporter({
    url: "host.docker.internal:4318/v1/traces",
  });

  const sdk = new NodeSDK({
    traceExporter,
    serviceName: serviceName,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
};

module.exports = start;


start("auth-service")