"use strict";

const promClient = require("prom-client");
const http = require("http");
const url = require("url");
const SunCalc = require("suncalc3");
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

const moonPositionAzimuthGauge = new promClient.Gauge({
  name: "moon_position_azimuth_degrees",
  help: "Azimuth of the moon at current location, in degrees",
  registers: [register],
});

const moonPositionAltitudeGauge = new promClient.Gauge({
  name: "moon_position_altitude_degrees",
  help: "Altitude of the moon at current location, in degrees",
  registers: [register],
});

const moonPositionDistanceGauge = new promClient.Gauge({
  name: "moon_position_distance_kilometers",
  help: "Distance to the moon at current location, in kilometers",
  registers: [register],
});

const moonPositionParallacticAngleGauge = new promClient.Gauge({
  name: "moon_position_parallacticangle_degrees",
  help: "Parallactic Angle to the moon at current location, in degrees",
  registers: [register],
});

const moonTimesSeconds = new promClient.Gauge({
  name: "moon_event_time_seconds",
  help: "Time, in seconds until event",
  registers: [register],
  labelNames: ["moon_event"],
});

const moonIlluminationFractionGauge = new promClient.Gauge({
  name: "moon_illumination_fraction",
  help: "Illuminated fraction of the moon; varies from 0.0 (new moon) to 1.0 (full moon)",
  registers: [register],
});

const moonIlluminationPhaseGauge = new promClient.Gauge({
  name: "moon_illumination_phase",
  help: "Moon phase; Varies through 0.0 New Moon, Waxing Crescent, 0.25 First Quarter, Waxing Gibbous, 0.5 Full Moon, Waning Gibbous, 0.75 Last Quarter, Waning Crescent",
  registers: [register],
});

const moonIlluminationAngleGauge = new promClient.Gauge({
  name: "moon_illumination_angle",
  help: "Midpoint angle in radians of the illuminated limb of the moon reckoned eastward from the north point of the disk; the moon is waxing if the angle is negative, and waning if positive",
  registers: [register],
});

const moonIlluminationZenithAngleGauge = new promClient.Gauge({
  name: "moon_illumination_zenith_angle",
  help: "Zenith angle of the moons bright limb (anticlockwise)",
  registers: [register],
});

function radiansToDegrees(rads) {
  return (rads * 180) / Math.PI;
}

const sunEvents = [
  "astronomicalDawn",
  "amateurDawn",
  "nauticalDawn",
  "blueHourDawnStart",
  "civilDawn",
  "blueHourDawnEnd",
  "goldenHourDawnStart",
  "sunriseStart",
  "sunriseEnd",
  "goldenHourDawnEnd",
  "solarNoon",
  "goldenHourDuskStart",
  "sunsetStart",
  "sunsetEnd",
  "goldenHourDuskEnd",
  "blueHourDuskStart",
  "civilDusk",
  "blueHourDuskEnd",
  "nauticalDusk",
  "amateurDusk",
  "astronomicalDusk",
  "nadir",
];

const moonEvents = [
  "rise",
  "set",
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

  // get sun times
  let sunTimes = SunCalc.getSunTimes(now, latitude, longitude);
  let sunTomorrowTimes = SunCalc.getSunTimes(tomorrowTimezoneAdjusted, latitude, longitude);

  for (let e of sunEvents) {
    let timeOfEvent = sunTimes[e].ts;
    if (timeOfEvent < now) {
      timeOfEvent = sunTomorrowTimes[e].ts;
    }

    sunTimesSeconds.set({ sun_event: e }, (timeOfEvent - now) / 1000);
  }

  // get position of the moon
  let moonPos = SunCalc.getMoonPosition(now, latitude, longitude);

  moonPositionAzimuthGauge.set(radiansToDegrees(moonPos.azimuth));
  moonPositionAltitudeGauge.set(radiansToDegrees(moonPos.altitude));
  moonPositionDistanceGauge.set(moonPos.distance);
  moonPositionParallacticAngleGauge.set(radiansToDegrees(moonPos.parallacticAngle));

  // get illumination of the moon
  let moonIllum = SunCalc.getMoonIllumination(now, latitude, longitude);

  moonIlluminationFractionGauge.set(moonIllum.fraction);
  moonIlluminationPhaseGauge.set(moonIllum.phase);
  moonIlluminationAngleGauge.set(radiansToDegrees(moonIllum.angle));
  moonIlluminationZenithAngleGauge.set(radiansToDegrees(moonPos.parallacticAngle - moonIllum.angle));
  
  // get moon times
  let moonTimes = SunCalc.getMoonTimes(now, latitude, longitude);
  let moonTomorrowTimes = SunCalc.getMoonTimes(tomorrowTimezoneAdjusted, latitude, longitude);

  for (let e of moonEvents) {
    let timeOfEvent = moonTimes[e].ts;
    if (timeOfEvent < now) {
      timeOfEvent = moonTomorrowTimes[e].ts;
    }

    moonTimesSeconds.set({ moon_event: e }, (timeOfEvent - now) / 1000);
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
