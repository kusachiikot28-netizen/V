import GpxParser from 'gpxparser';

export const exportToGPX = (points: [number, number][], name: string = 'route') => {
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BikeRoute Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name}</name>
    <trkseg>
      ${points.map(p => `<trkpt lat="${p[1]}" lon="${p[0]}"></trkpt>`).join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importFromGPX = async (file: File): Promise<[number, number][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gpx = new GpxParser();
        gpx.parse(e.target?.result as string);
        const points = gpx.tracks[0]?.points.map(p => [p.lon, p.lat] as [number, number]) || [];
        resolve(points);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
