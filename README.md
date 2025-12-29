# Search Algorithm Visualizer

A React app that lets you build a grid, place a start and target, draw walls, and watch Dijkstra and A* explore the map in real time. Each algorithm paints its visited cells and then highlights the shortest path it finds.

## What this visualizer does
- Lets you set the grid size.
- Place a single Start (green) and a single Target (red).
- Draw Walls (blue) by clicking or dragging.
- Toggle Dijkstra, A*, or both, then run the simulation.
- Animates each algorithm’s search and final shortest path.

## The Algorithms...

### Dijkstra’s Algorithm
- Think of it as a careful explorer that expands outward from the start in all directions.
- It guarantees the shortest path in grids with equal movement cost.
- Because it explores evenly, it can visit a lot of cells before reaching the target.

### A* (A-star)
- A* uses the same careful cost tracking as Dijkstra, but adds a “guess” (heuristic) to steer toward the target.
- The heuristic used here is Manhattan distance (how many steps away in a grid).
- It still finds the shortest path, but usually visits fewer cells than Dijkstra.

## How to use
1. Set the grid size and click Apply.
2. Select a draw tool: Start, Wall, or Target.
3. Click the grid to place the Start and Target, then paint walls.
4. Toggle Dijkstra, A*, or Both.
5. Click Start Search to run the visualization.
6. Use Reset Simulation to clear only the algorithm colors.
7. Use Clear to remove everything from the board.

## Color guide
- Green: Start
- Red: Target
- Blue: Wall
- Teal: Dijkstra visited/path
- Purple: A* visited/path
