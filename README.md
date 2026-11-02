# Traffic simulation lab

A runnable, deterministic agent-based model of traffic on a road network with junctions, roads of different widths and capacities, and an optional grade-separated flyover.

## Run locally

No installation, API keys, database or paid services are needed.

```sh
python3 -m http.server 8000
# Open http://localhost:8000
```

Do not open index.html directly as a file: browsers require HTTP for ES modules.

Run the tests with Node.js 18 or later:

```sh
npm test
# or: node --test engine.test.mjs
```

## Features

- 9 signalised junctions, 12 boundary gateways and bidirectional 200 m road segments.
- Each vehicle has an origin, destination, route, lane, position, speed and wait time.
- Configurable demand, main-road lane count, speed limit, signal cycle, east-west green share and random seed.
- Optional two-lane-per-direction flyover bypassing surface junctions.
- Quiet, rush-hour and stress-test presets; start, pause, reset, single step and 1x/10x/30x playback.
- Live vehicle rendering, speed, queues, completed trips, trip time, throughput and history chart.
- Paired ten-minute flyover/no-flyover experiment with the same seed and arrivals.
- CSV results export and validated JSON scenario import/export.
- Responsive layout, labelled controls and visible keyboard focus.

## Architecture

- `engine.mjs`: pure deterministic model and shortest-path routing. No DOM dependencies.
- `ui.js`: SVG map, controls, exports and experiment runner.
- `style.css`: responsive presentation.
- `engine.test.mjs`: model regression and invariant tests.
- `index.html`: static entry point. Works on GitHub Pages with no build step.
- `development-log.jsonl`: project-only implementation notes, **not a raw or unedited coding-session transcript**.

## Model and units

Distances are metres, time is seconds, internal speed is m/s and displayed speed is km/h. The engine advances in fixed 0.25 s steps. Seeded exponential interarrival times produce demand in vehicles/hour. Origin and destination gateways are sampled uniformly; routes minimise free-flow travel time. Vehicles accelerate at 2 m/s², use a stopping-speed rule with 3 m/s² braking and maintain at least 7 m front-to-front lane spacing. The model uses a hard safe-gap displacement cap.

The middle east-west corridor has 1-4 lanes per direction. Side streets have one lane per direction and a maximum speed limit of 35 km/h. Signals alternate east-west and north-south phases, with a 5 s offset between adjacent junctions. The optional 800 m elevated through route has two lanes per direction and a speed limit of at least 65 km/h. Lane capacity is an emergent effect of spacing, speed, signals and downstream entry space, not a fixed measured capacity value.

Unentered vehicles wait in an external queue. To keep the browser responsive, there are safety caps of 2,000 active vehicles and 2,000 pending arrivals; overflow is counted as unserved.

### Metrics

- Active vehicles: currently inside the network.
- Mean speed: instantaneous arithmetic mean of active vehicle speeds.
- Stopped vehicles: active agents moving below 1 m/s.
- Mean trip time: completed trips only, including external entry waiting.
- Mean stopped time in comparisons: completed trips only, in-network speed below 1 m/s.
- Throughput: completed trips / elapsed simulated hours, including startup effects.
- History samples: one every 5 simulated seconds.

### Limitations

This is an educational scenario model, not a calibrated transport-engineering tool. Junctions use simplified point transfers, not geometric conflict resolution; opposite-direction turning conflicts are not modelled. No lane changing, overtaking, yellow/all-red phases, pedestrians, real maps, incidents, emissions or empirical traffic calibration. Comparison runs include startup and do not exclude a warm-up interval. Small outcome differences should not be treated as real-world predictions. The UI explains these assumptions next to the model.

## Deployment

In GitHub repository settings, enable Pages from the `main` branch, root folder. This project needs no Actions workflow, build server, secrets or external runtime dependencies.

## Submission evidence

Project request received: **2026-11-02 20:01 IST**. This is the user's project request time, not a claim about an external coding-tool prompt timestamp. No external coding-platform session ID or raw session export is supplied. See the repository's commit history for authoritative commit timestamps.
