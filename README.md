# suncalc_exporter

Prometheus Exporter for calculating the position of the sun. Possibly useful in
solar installation monitoring.

Uses the [suncalc](https://github.com/mourner/suncalc) library.

## Usage

```console
$ node index.js  --latitude -34.1 --longitude 18.1 --listen-port 2922 --help
Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --latitude         Latitude to calculate sun position for             [number]
  --longitude        Longitude to calculate sun position for            [number]
  --listen-port, -p  Port to listen on                  [number] [default: 3418]
```

## Metrics

```text
# HELP sun_position_azimuth_degrees Azimuth of the sun at current location, in degrees
# TYPE sun_position_azimuth_degrees gauge
sun_position_azimuth_degrees 123.85630669790773

# HELP sun_position_altitude_degrees Altitude of the sun at current location, in degrees
# TYPE sun_position_altitude_degrees gauge
sun_position_altitude_degrees 6.508888846905346

# HELP sun_event_time_seconds Time, in seconds until event
# TYPE sun_event_time_seconds gauge
sun_event_time_seconds{sun_event="sunrise"} 53291.499
sun_event_time_seconds{sun_event="sunriseEnd"} 53466.438
sun_event_time_seconds{sun_event="goldenHourEnd"} 55591.413
sun_event_time_seconds{sun_event="solarNoon"} 71114.721
sun_event_time_seconds{sun_event="goldenHour"} 214.63
sun_event_time_seconds{sun_event="sunsetStart"} 2341.113
sun_event_time_seconds{sun_event="sunset"} 2516.159
sun_event_time_seconds{sun_event="dusk"} 4182.091
sun_event_time_seconds{sun_event="nauticalDusk"} 6059.204
sun_event_time_seconds{sun_event="night"} 7890.285
sun_event_time_seconds{sun_event="nadir"} 27914.721
sun_event_time_seconds{sun_event="nightEnd"} 47919.813
sun_event_time_seconds{sun_event="nauticalDawn"} 49750.224
sun_event_time_seconds{sun_event="dawn"} 51626.489
```

## Licence

Copyright 2020, Andrew Newdigate

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


