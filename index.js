"use strict";

const promClient = require("prom-client");
const http = require("http");
const url = require("url");
const SunCalc = require("suncalc");
const startOfTomorrow = require("date-fns/startOfTomorrow");

const options = require("yargs") // eslint-disable-line
  .option("latitude", {
    type: "number",
    description: "Latitude to calculate sun position for",
  })
  .option("longitude", {
    type: "number",
    description: "Longitude to calculate sun position for",
  })
  .option("listen-port", {
    alias: "p",
    type: "number",
    description: "Port to listen on",
    default: 3418,
  }).argv;

const register = new promClient.Registry();
const sunPositionAzimuthGauge = new promClient.Gauge({
  name: "sun_position_azimuth_degrees",
  help: "Azimuth of the sun at current location, in degrees",
  registers: [register],
});

const sunPositionAltitudeGauge = new promClient.Gauge({
  name: "sun_position_altitude_degrees",
  help: "Altitude of the sun at current location, in degrees",
  registers: [register],
});

const sunTimesSeconds = new promClient.Gauge({
  name: "sun_event_time_seconds",
  help: "Time, in seconds until event",
  registers: [register],
  labelNames: ["sun_event"],
});

function radiansToDegrees(rads) {
  return (rads * 180) / Math.PI;
}

const sunEvents = [
  "sunrise",
  "sunriseEnd",
  "goldenHourEnd",
  "solarNoon",
  "goldenHour",
  "goldenHourEnd",
  "solarNoon",
  "goldenHour",
  "sunsetStart",
  "sunset",
  "dusk",
  "nauticalDusk",
  "night",
  "nadir",
  "nightEnd",
  "nauticalDawn",
  "dawn",
];

function updateGauges(latitude, longitude) {
  const now = new Date();
  const tomorrow = startOfTomorrow();

  // suncalc seems to be based on UTC dates
  const tomorrowTimezoneAdjusted = new Date(tomorrow.valueOf() - tomorrow.getTimezoneOffset() * 60 * 1000);

  // get position of the sun (azimuth and altitude) at today's sunrise
  let sunPos = SunCalc.getPosition(now, latitude, longitude);

  sunPositionAzimuthGauge.set(radiansToDegrees(sunPos.azimuth));
  sunPositionAltitudeGauge.set(radiansToDegrees(sunPos.altitude));

  let times = SunCalc.getTimes(now, latitude, longitude);
  let tomorrowTimes = SunCalc.getTimes(tomorrowTimezoneAdjusted, latitude, longitude);

  for (let e of sunEvents) {
    let timeOfEvent = times[e];
    if (timeOfEvent < now) {
      timeOfEvent = tomorrowTimes[e];
    }

    sunTimesSeconds.set({ sun_event: e }, (timeOfEvent - now) / 1000);
  }
}

function createServer(options) {
  return function serverFunc(req, res) {
    let parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname == "/metrics") {
      updateGauges(options.latitude, options.longitude);

      res.writeHead(200, { "Content-Type": register.contentType });
      res.write(register.metrics());
      res.end();
      return;
    }

    res.writeHead(404);
    res.end();
  };
}

console.error(`Listening on port ${options.listenPort} for ${options.latitude} ${options.longitude}`);

http.createServer(createServer(options)).listen(options.listenPort);
