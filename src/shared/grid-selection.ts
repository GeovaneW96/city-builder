export type GridPosition = [number, number];

export function getGridLine(
  [startX, startY]: GridPosition,
  [endX, endY]: GridPosition,
): GridPosition[] {
  const positions: GridPosition[] = [];
  const deltaX = Math.abs(endX - startX);
  const deltaY = Math.abs(endY - startY);
  const stepX = startX < endX ? 1 : -1;
  const stepY = startY < endY ? 1 : -1;
  let x = startX;
  let y = startY;
  let error = deltaX - deltaY;

  while (true) {
    positions.push([x, y]);
    if (x === endX && y === endY) return positions;
    const doubledError = error * 2;
    if (doubledError > -deltaY) {
      error -= deltaY;
      x += stepX;
    }
    if (doubledError < deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

export function getGridRectangle(
  [startX, startY]: GridPosition,
  [endX, endY]: GridPosition,
): GridPosition[] {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  const positions: GridPosition[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      positions.push([x, y]);
    }
  }

  return positions;
}
