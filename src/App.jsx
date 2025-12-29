import { useEffect, useMemo, useState } from 'react'

const DEFAULT_SIZE = 20
const MIN_SIZE = 8
const MAX_SIZE = 35
const STEP_DELAY = 22
const PATH_DELAY = 28

const TOOL = {
  START: 'start',
  WALL: 'wall',
  TARGET: 'target',
}

const buildGrid = (size) =>
  Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      isWall: false,
    })),
  )

const cellKey = (row, col) => `${row}-${col}`

const clampSize = (value) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, value))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getNeighbors = (grid, row, col) => {
  const size = grid.length
  const candidates = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]

  return candidates
    .filter(([r, c]) => r >= 0 && c >= 0 && r < size && c < size)
    .filter(([r, c]) => !grid[r][c].isWall)
    .map(([r, c]) => ({ row: r, col: c }))
}

const reconstructPath = (cameFrom, start, target) => {
  const path = []
  let current = target

  while (current) {
    path.unshift(current)
    if (current.row === start.row && current.col === start.col) {
      break
    }
    current = cameFrom[current.row][current.col]
  }

  if (!path.length) return []
  if (path[0].row !== start.row || path[0].col !== start.col) return []
  return path
}

const runDijkstra = (grid, start, target) => {
  const size = grid.length
  const distances = Array.from({ length: size }, () =>
    Array(size).fill(Infinity),
  )
  const cameFrom = Array.from({ length: size }, () => Array(size).fill(null))
  const visitedOrder = []
  const visited = new Set()

  const queue = [{ row: start.row, col: start.col, dist: 0 }]
  distances[start.row][start.col] = 0

  while (queue.length) {
    queue.sort((a, b) => a.dist - b.dist)
    const current = queue.shift()
    const currentKey = cellKey(current.row, current.col)

    if (visited.has(currentKey)) continue
    visited.add(currentKey)
    visitedOrder.push({ row: current.row, col: current.col })

    if (current.row === target.row && current.col === target.col) {
      break
    }

    const neighbors = getNeighbors(grid, current.row, current.col)
    neighbors.forEach((neighbor) => {
      const alt = distances[current.row][current.col] + 1
      if (alt < distances[neighbor.row][neighbor.col]) {
        distances[neighbor.row][neighbor.col] = alt
        cameFrom[neighbor.row][neighbor.col] = {
          row: current.row,
          col: current.col,
        }
        queue.push({ row: neighbor.row, col: neighbor.col, dist: alt })
      }
    })
  }

  return {
    visitedOrder,
    path: reconstructPath(cameFrom, start, target),
  }
}

const runAStar = (grid, start, target) => {
  const size = grid.length
  const gScore = Array.from({ length: size }, () =>
    Array(size).fill(Infinity),
  )
  const fScore = Array.from({ length: size }, () =>
    Array(size).fill(Infinity),
  )
  const cameFrom = Array.from({ length: size }, () => Array(size).fill(null))
  const visitedOrder = []
  const closedSet = new Set()

  const heuristic = (row, col) =>
    Math.abs(row - target.row) + Math.abs(col - target.col)

  gScore[start.row][start.col] = 0
  fScore[start.row][start.col] = heuristic(start.row, start.col)

  const openSet = [{ row: start.row, col: start.col, f: fScore[start.row][start.col] }]

  while (openSet.length) {
    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()
    const currentKey = cellKey(current.row, current.col)

    if (closedSet.has(currentKey)) continue
    closedSet.add(currentKey)
    visitedOrder.push({ row: current.row, col: current.col })

    if (current.row === target.row && current.col === target.col) {
      break
    }

    const neighbors = getNeighbors(grid, current.row, current.col)
    neighbors.forEach((neighbor) => {
      const neighborKey = cellKey(neighbor.row, neighbor.col)
      if (closedSet.has(neighborKey)) return

      const tentativeG = gScore[current.row][current.col] + 1
      if (tentativeG < gScore[neighbor.row][neighbor.col]) {
        cameFrom[neighbor.row][neighbor.col] = {
          row: current.row,
          col: current.col,
        }
        gScore[neighbor.row][neighbor.col] = tentativeG
        const f = tentativeG + heuristic(neighbor.row, neighbor.col)
        fScore[neighbor.row][neighbor.col] = f
        openSet.push({ row: neighbor.row, col: neighbor.col, f })
      }
    })
  }

  return {
    visitedOrder,
    path: reconstructPath(cameFrom, start, target),
  }
}

function App() {
  const [gridSize, setGridSize] = useState(DEFAULT_SIZE)
  const [gridSizeInput, setGridSizeInput] = useState(String(DEFAULT_SIZE))
  const [grid, setGrid] = useState(() => buildGrid(DEFAULT_SIZE))
  const [tool, setTool] = useState(TOOL.WALL)
  const [startCell, setStartCell] = useState(null)
  const [targetCell, setTargetCell] = useState(null)
  const [dijkstraEnabled, setDijkstraEnabled] = useState(false)
  const [astarEnabled, setAstarEnabled] = useState(false)
  const [visitedDijkstra, setVisitedDijkstra] = useState(new Set())
  const [visitedAstar, setVisitedAstar] = useState(new Set())
  const [pathDijkstra, setPathDijkstra] = useState(new Set())
  const [pathAstar, setPathAstar] = useState(new Set())
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Place a start and target to begin.')

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const cellSize = useMemo(() => {
    const size = Math.floor(560 / gridSize)
    return Math.max(14, Math.min(32, size))
  }, [gridSize])

  const clearOverlays = () => {
    setVisitedDijkstra(new Set())
    setVisitedAstar(new Set())
    setPathDijkstra(new Set())
    setPathAstar(new Set())
  }

  const resetBoard = () => {
    clearOverlays()
    setStatusMessage('Simulation cleared. Ready for another run.')
  }

  const clearBoard = () => {
    setGrid(buildGrid(gridSize))
    setStartCell(null)
    setTargetCell(null)
    clearOverlays()
    setStatusMessage('Board cleared. Configure a new run.')
  }

  const applyGridSize = (event) => {
    event.preventDefault()
    const parsed = Number.parseInt(gridSizeInput, 10)
    if (Number.isNaN(parsed)) {
      setGridSizeInput(String(gridSize))
      return
    }
    const nextSize = clampSize(parsed)
    setGridSize(nextSize)
    setGridSizeInput(String(nextSize))
    setGrid(buildGrid(nextSize))
    setStartCell(null)
    setTargetCell(null)
    clearOverlays()
    setStatusMessage('Grid resized. Place your start and target nodes.')
  }

  const updateWall = (row, col, nextValue) => {
    setGrid((prev) => {
      const current = prev[row][col]
      if (current.isWall === nextValue) return prev
      const nextGrid = prev.map((gridRow) => gridRow.map((cell) => ({ ...cell })))
      nextGrid[row][col] = { ...current, isWall: nextValue }
      return nextGrid
    })
  }

  const handleCellAction = (row, col, paintWall) => {
    if (isRunning) return
    clearOverlays()

    const isStartCell = startCell && startCell.row === row && startCell.col === col
    const isTargetCell = targetCell && targetCell.row === row && targetCell.col === col

    if (tool === TOOL.WALL) {
      if (isStartCell || isTargetCell) return
      if (paintWall) {
        updateWall(row, col, true)
      } else {
        updateWall(row, col, !grid[row][col].isWall)
      }
      return
    }

    if (tool === TOOL.START) {
      updateWall(row, col, false)
      setStartCell({ row, col })
      setStatusMessage('Start node placed. Choose a target.')
      return
    }

    if (tool === TOOL.TARGET) {
      updateWall(row, col, false)
      setTargetCell({ row, col })
      setStatusMessage('Target node placed. Select an algorithm to run.')
    }
  }

  const handleMouseDown = (row, col) => {
    setIsMouseDown(true)
    handleCellAction(row, col, false)
  }

  const handleMouseEnter = (row, col) => {
    if (!isMouseDown || tool !== TOOL.WALL) return
    handleCellAction(row, col, true)
  }

  const runVisualization = async () => {
    if (isRunning || !startCell || !targetCell) return
    if (!dijkstraEnabled && !astarEnabled) {
      setStatusMessage('Select at least one algorithm to run.')
      return
    }

    setIsRunning(true)
    clearOverlays()
    setStatusMessage('Running search algorithms...')

    const dijkstraResult = dijkstraEnabled
      ? runDijkstra(grid, startCell, targetCell)
      : null
    const astarResult = astarEnabled ? runAStar(grid, startCell, targetCell) : null

    const visitLength = Math.max(
      dijkstraResult?.visitedOrder.length ?? 0,
      astarResult?.visitedOrder.length ?? 0,
    )

    for (let i = 0; i < visitLength; i += 1) {
      if (dijkstraResult?.visitedOrder[i]) {
        const { row, col } = dijkstraResult.visitedOrder[i]
        setVisitedDijkstra((prev) => {
          const next = new Set(prev)
          next.add(cellKey(row, col))
          return next
        })
      }

      if (astarResult?.visitedOrder[i]) {
        const { row, col } = astarResult.visitedOrder[i]
        setVisitedAstar((prev) => {
          const next = new Set(prev)
          next.add(cellKey(row, col))
          return next
        })
      }

      await sleep(STEP_DELAY)
    }

    const pathLength = Math.max(
      dijkstraResult?.path.length ?? 0,
      astarResult?.path.length ?? 0,
    )

    for (let i = 0; i < pathLength; i += 1) {
      if (dijkstraResult?.path[i]) {
        const { row, col } = dijkstraResult.path[i]
        setPathDijkstra((prev) => {
          const next = new Set(prev)
          next.add(cellKey(row, col))
          return next
        })
      }

      if (astarResult?.path[i]) {
        const { row, col } = astarResult.path[i]
        setPathAstar((prev) => {
          const next = new Set(prev)
          next.add(cellKey(row, col))
          return next
        })
      }

      await sleep(PATH_DELAY)
    }

    const dijkstraFound = dijkstraResult && dijkstraResult.path.length > 0
    const astarFound = astarResult && astarResult.path.length > 0
    let message = 'Search complete.'

    if (dijkstraEnabled || astarEnabled) {
      if (!dijkstraFound && !astarFound) {
        message = 'No path found.'
      } else if (dijkstraEnabled && !dijkstraFound) {
        message = 'Dijkstra did not find a path.'
      } else if (astarEnabled && !astarFound) {
        message = 'A* did not find a path.'
      }
    }

    setStatusMessage(message)
    setIsRunning(false)
  }

  const isReady = Boolean(startCell && targetCell && (dijkstraEnabled || astarEnabled))
  const statusText = isRunning
    ? 'Running search algorithms...'
    : !startCell && !targetCell
      ? 'Place a start and target node to begin.'
      : !startCell
        ? 'Place a start node.'
        : !targetCell
          ? 'Place a target node.'
          : !dijkstraEnabled && !astarEnabled
            ? 'Select at least one algorithm to run.'
            : 'Ready to visualize.'

  return (
    <div className="app-shell">
      <main className="main-content">
        <div className="page">
          <section className="panel visualizer-shell">
            <div className="control-grid">
              <div className="section-header">
                <h1>Search Algorithm Visualizer</h1>
                <p>
                  Configure the grid, paint walls, and compare Dijkstra against A*.
                  Watch each algorithm explore the maze and highlight its shortest path.
                </p>
              </div>
              <form className="control-row" onSubmit={applyGridSize}>
                <label htmlFor="grid-size">Grid size</label>
                <input
                  id="grid-size"
                  className="control-input"
                  type="number"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  value={gridSizeInput}
                  onChange={(event) => setGridSizeInput(event.target.value)}
                  disabled={isRunning}
                />
                <button className="button" type="submit" disabled={isRunning}>
                  Apply
                </button>
                <span className="muted-text">Min {MIN_SIZE} · Max {MAX_SIZE}</span>
              </form>

              <div className="control-row">
                <label>Draw tools</label>
                <div className="button-row">
                  <button
                    className={`button button--start ${tool === TOOL.START ? 'button--active' : ''}`}
                    onClick={() => setTool(TOOL.START)}
                    type="button"
                    disabled={isRunning}
                  >
                    Start
                  </button>
                  <button
                    className={`button button--wall ${tool === TOOL.WALL ? 'button--active' : ''}`}
                    onClick={() => setTool(TOOL.WALL)}
                    type="button"
                    disabled={isRunning}
                  >
                    Wall
                  </button>
                  <button
                    className={`button button--target ${tool === TOOL.TARGET ? 'button--active' : ''}`}
                    onClick={() => setTool(TOOL.TARGET)}
                    type="button"
                    disabled={isRunning}
                  >
                    Target
                  </button>
                  <button
                    className="button button--reset"
                    type="button"
                    onClick={clearBoard}
                    disabled={isRunning}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="control-row">
                <label>Algorithms</label>
                <div className="button-row">
                  <button
                    className={`button button--dijkstra ${dijkstraEnabled ? 'button--active' : ''}`}
                    onClick={() => setDijkstraEnabled((prev) => !prev)}
                    type="button"
                    disabled={isRunning}
                  >
                    Dijkstra
                  </button>
                  <button
                    className={`button button--astar ${astarEnabled ? 'button--active' : ''}`}
                    onClick={() => setAstarEnabled((prev) => !prev)}
                    type="button"
                    disabled={isRunning}
                  >
                    A*
                  </button>
                  <button
                    className="button button--both"
                    onClick={() => {
                      setDijkstraEnabled(true)
                      setAstarEnabled(true)
                    }}
                    type="button"
                    disabled={isRunning}
                  >
                    Both
                  </button>
                </div>
              </div>

              <div className="control-row">
                <label>Run</label>
                <div className="button-row">
                  <button
                    className="button button--run"
                    type="button"
                    onClick={runVisualization}
                    disabled={!isReady || isRunning}
                  >
                    Start Search
                  </button>
                  <button
                    className="button button--reset"
                    type="button"
                    onClick={resetBoard}
                    disabled={isRunning}
                  >
                    Reset Simulation
                  </button>
                </div>
              </div>

              <div className="status-bar">
                <span className="status-pill">{statusText}</span>
                <span className="status-pill">{statusMessage}</span>
              </div>

              <div className="legend">
                <div className="legend-item">
                  <span className="legend-swatch legend-swatch--start" /> Start
                </div>
                <div className="legend-item">
                  <span className="legend-swatch legend-swatch--target" /> Target
                </div>
                <div className="legend-item">
                  <span className="legend-swatch legend-swatch--wall" /> Wall
                </div>
                <div className="legend-item">
                  <span className="legend-swatch legend-swatch--dijkstra" /> Dijkstra
                </div>
                <div className="legend-item">
                  <span className="legend-swatch legend-swatch--astar" /> A*
                </div>
              </div>
            </div>

            <div className="grid-wrapper">
              <div
                className="grid-board"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                  gridAutoRows: `${cellSize}px`,
                  '--cell-size': `${cellSize}px`,
                }}
                onMouseLeave={() => setIsMouseDown(false)}
              >
                {grid.map((row) =>
                  row.map((cell) => {
                    const key = cellKey(cell.row, cell.col)
                    const isStart =
                      startCell && startCell.row === cell.row && startCell.col === cell.col
                    const isTarget =
                      targetCell && targetCell.row === cell.row && targetCell.col === cell.col
                    const isWall = cell.isWall
                    const dVisited = visitedDijkstra.has(key)
                    const aVisited = visitedAstar.has(key)
                    const dPath = pathDijkstra.has(key)
                    const aPath = pathAstar.has(key)

                    let cellClass = 'cell'
                    if (isStart) {
                      cellClass += ' cell--start'
                    } else if (isTarget) {
                      cellClass += ' cell--target'
                    } else if (isWall) {
                      cellClass += ' cell--wall'
                    } else if (dPath && aPath) {
                      cellClass += ' cell--both-path'
                    } else if (dPath) {
                      cellClass += ' cell--dijkstra-path'
                    } else if (aPath) {
                      cellClass += ' cell--astar-path'
                    } else if (dVisited && aVisited) {
                      cellClass += ' cell--both-visited'
                    } else if (dVisited) {
                      cellClass += ' cell--dijkstra-visited'
                    } else if (aVisited) {
                      cellClass += ' cell--astar-visited'
                    }

                    return (
                      <div
                        key={key}
                        className={cellClass}
                        role="button"
                        tabIndex={0}
                        onMouseDown={() => handleMouseDown(cell.row, cell.col)}
                        onMouseEnter={() => handleMouseEnter(cell.row, cell.col)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            handleCellAction(cell.row, cell.col, false)
                          }
                        }}
                      />
                    )
                  }),
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
