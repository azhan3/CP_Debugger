# Graph_Visualizer
CP Graph Visualizer
Purpose:
*Debugging Library
* Multiple languages
* Set breakpoints to debug certain variables/data structures
* Connects to Visualization Tool to display objects
* Visualization Tool
* Ability to visualize:
* Variables (integers, strings, arrays)
* Data Structures
* Graphs
* Shows code and location of breakpoints

Goal:
* We want competitive programmers using this program

Tools:
* Debugging Library
* C++ library
* Visualization Tool
* Bootstrap Frontend

## Backend storage

The Next.js API persists sessions to a local JSON file so runs survive server restarts.

- `CP_DEBUG_STORE_PATH`: override the sessions file path (default: `./storage/sessions.json` relative to the Next.js working directory).
- `CP_DEBUG_MAX_SESSIONS`: retain only the most recent N sessions (optional).

## Docker

- Build the images once: `docker compose build`
- Start both services: `docker compose up`
  - Frontend (Next.js) is available on http://localhost:3000
  - Backend (Express) is available on http://localhost:4000
- Stop the stack: `docker compose down`

### Useful one-offs

- Build only the backend image: `docker build --target backend -t cp-debugger-backend .`
- Build only the frontend image: `docker build --target frontend -t cp-debugger-frontend .`
