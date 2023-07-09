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
  name: "moon_illumination_angle_degrees",
  help: "Midpoint angle in radians of the illuminated limb of the moon reckoned eastward from the north point of the disk; the moon is waxing if the angle is negative, and waning if positive",
  registers: [register],
});

const moonIlluminationZenithAngleGauge = new promClient.Gauge({
  name: "moon_illumination_zenith_angle_degrees",
  help: "Zenith angle of the moons bright limb (anticlockwise)",
  registers: [register],
});

function radiansToDegrees(rads) {
  return (rads * 180) / Math.PI;
}

let roundOff = (num, places) => {
  const x = Math.pow(10,places);
  return Math.round(num * x) / x;
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
  "highest",
  "set",
  "nextNewMoon",
  "nextFullMoon",
  "moonAge",
];

function updateGauges(latitude, longitude) {

//  const now_ts = (new Date()).getTime();
//  const tomorrow_ts = (startOfTomorrow()).getTime();

  const now = new Date();
  const tomorrow = startOfTomorrow();

  // suncalc seems to be based on UTC dates
  const tomorrowTimezoneAdjusted = new Date(tomorrow.valueOf() - tomorrow.getTimezoneOffset() * 60 * 1000);

  // get position of the sun (azimuth and altitude)
  let sunPos = SunCalc.getPosition(now, latitude, longitude);
  sunPositionAzimuthGauge.set(roundOff(sunPos.azimuthDegrees, 2));
  sunPositionAltitudeGauge.set(roundOff(sunPos.altitudeDegrees, 2));
  //sunPositionAltitudeGauge.set(sunPos.altitudeDegrees));
  //sunPositionAltitudeGauge.set(sunPos.altitudeDegrees));

  // get sun times
  let sunTimes = SunCalc.getSunTimes(now, latitude, longitude, 0, false, true);
  let sunTomorrowTimes = SunCalc.getSunTimes(tomorrowTimezoneAdjusted, latitude, longitude, 0, false, true);

  for (let e of sunEvents) {
  // TBD handle valid = false
    let timeOfEvent = sunTimes[e].ts;
    let valid = sunTimes[e].valid;
    if (timeOfEvent < now ) {
      timeOfEvent = sunTomorrowTimes[e].ts;
      valid = sunTomorrowTimes[e].valid;
    }
    if (valid==true) {
      sunTimesSeconds.set({ sun_event: e }, roundOff((timeOfEvent - now) / 1000, 0));
    }
  }

  // get position of the moon
  let moonPos = SunCalc.getMoonPosition(now, latitude, longitude);
  moonPositionAzimuthGauge.set(roundOff(moonPos.azimuthDegrees, 2));
  moonPositionAltitudeGauge.set(roundOff(moonPos.altitudeDegrees, 2));
  moonPositionDistanceGauge.set(roundOff(moonPos.distance, 0));
  moonPositionParallacticAngleGauge.set(roundOff(moonPos.parallacticAngleDegrees, 2));

  // get moon times
  let moonTimes = SunCalc.getMoonTimes(now, latitude, longitude, true);
  let moonTomorrowTimes = SunCalc.getMoonTimes(tomorrowTimezoneAdjusted, latitude, longitude, true);

  for (let e of moonEvents) {
    if ( typeof moonTimes[e] !== 'undefined') {
      let timeOfEvent = moonTimes[e].getTime();
      if (timeOfEvent < now) {
        timeOfEvent = moonTomorrowTimes[e].getTime();
      }
      moonTimesSeconds.set({ moon_event: 'moon' + e[0].toUpperCase() + e.slice(1).toLowerCase() }, roundOff((timeOfEvent - now) / 1000, 0));
    }
  }

  // get current illumination of the moon
  let moonIllum = SunCalc.getMoonIllumination(now, latitude, longitude);
  moonIlluminationFractionGauge.set(roundOff(moonIllum.fraction, 2));
  moonIlluminationPhaseGauge.set(roundOff(moonIllum.phaseValue, 2));
  moonIlluminationAngleGauge.set(roundOff(radiansToDegrees(moonIllum.angle), 2));
  moonIlluminationZenithAngleGauge.set(roundOff(moonPos.parallacticAngle - radiansToDegrees(moonIllum.angle),2));

  // get next new/full moon
  moonTimesSeconds.set({ moon_event: 'nextNewMoon' }, roundOff((moonIllum.next.newMoon.value - now) / 1000, 0));
  moonTimesSeconds.set({ moon_event: 'nextFullMoon' }, roundOff((moonIllum.next.fullMoon.value - now) / 1000, 0));

  // get last new moon offset
  let last_cycle_offset = 0
  if ( moonIllum.fraction < 0.5 ) {
    last_cycle_offset = 21;
  } else {
    last_cycle_offset = 35;
  }
  
  // calculate age from last new moon to now
  let lastMoonIllum = SunCalc.getMoonIllumination(now - (last_cycle_offset*24*60*60*1000), latitude, longitude);
  moonTimesSeconds.set({ moon_event: 'moonAge' }, roundOff(((now - lastMoonIllum.next.newMoon.value) / 1000), 0));

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

