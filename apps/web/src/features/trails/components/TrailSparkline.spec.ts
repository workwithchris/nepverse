import { buildTrailMap } from './TrailSparkline';

describe('trail map', () => {
  it('fits longitude/latitude to map tiles without connecting disconnected ways', () => {
    const map = buildTrailMap(
      [
        [85.3, 27.7],
        [85.3001, 27.7001],
        [85.4, 27.8],
        [85.4001, 27.8001],
      ],
      320,
      180,
    );

    if (!map) throw new Error('Expected a route map');
    expect(map.path.match(/M /g)).toHaveLength(2);
    expect(map.path.match(/L /g)).toHaveLength(2);
    expect(map.loop).toBe(false);
    expect(map.start).not.toEqual(map.finish);
    expect(map.tiles[0].url).toMatch(
      new RegExp(`^https://tile\\.openstreetmap\\.org/${map.zoom}/`),
    );
  });
});
