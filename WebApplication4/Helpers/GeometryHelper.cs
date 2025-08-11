
using System;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using ProjNet.CoordinateSystems;
using ProjNet.CoordinateSystems.Transformations;

namespace WebApplication4.Helpers
{
    public static class GeometryHelper
    {
        public static Geometry WktToGeometry(string wkt, int sourceSRID = 4326, int? targetSRID = null)
        {
            var reader = new WKTReader();
            Geometry geometry;

            try
            {
                geometry = reader.Read(wkt);
            }
            catch (ParseException ex)
            {
                throw new ArgumentException("Geometri parse edilemedi. Hatalı WKT formatı.", ex);
            }

            geometry.SRID = sourceSRID;

            // Eğer SRID dönüşümü yapılacaksa
            if (targetSRID.HasValue && targetSRID != sourceSRID)
            {
                var sourceCs = GeographicCoordinateSystem.WGS84;
                var targetCs = ProjectedCoordinateSystem.WebMercator;

                var transformFactory = new CoordinateTransformationFactory();
                var transform = transformFactory.CreateFromCoordinateSystems(sourceCs, targetCs);

                var factory = geometry.Factory;
                Geometry transformedGeometry;

                // Nokta tipi
                if (geometry is NetTopologySuite.Geometries.Point pt)
                {
                    var ptCoords = transform.MathTransform.Transform(new[] { pt.X, pt.Y });
                    transformedGeometry = factory.CreatePoint(new NetTopologySuite.Geometries.Coordinate(ptCoords[0], ptCoords[1]));
                }
                // Çizgi tipi
                else if (geometry is NetTopologySuite.Geometries.LineString line)
                {
                    var transformedCoords = TransformCoordinates(line.Coordinates, transform);
                    transformedGeometry = factory.CreateLineString(transformedCoords);
                }
                // Poligon tipi
                else if (geometry is NetTopologySuite.Geometries.Polygon polygon)
                {
                    var transformedCoords = TransformCoordinates(polygon.ExteriorRing.Coordinates, transform);
                    var shell = factory.CreateLinearRing(transformedCoords);
                    transformedGeometry = factory.CreatePolygon(shell);
                }
                else
                {
                    throw new NotSupportedException($"Geometri tipi '{geometry.GeometryType}' desteklenmiyor.");
                }

                transformedGeometry.SRID = targetSRID.Value;
                return transformedGeometry;
            }

            return geometry;
        }

        // Yardımcı fonksiyon: koordinatları dönüştür
        private static NetTopologySuite.Geometries.Coordinate[] TransformCoordinates(NetTopologySuite.Geometries.Coordinate[] coords, ICoordinateTransformation transform)
        {
            var transformed = new NetTopologySuite.Geometries.Coordinate[coords.Length];

            for (int i = 0; i < coords.Length; i++)
            {
                var from = new[] { coords[i].X, coords[i].Y };
                var to = transform.MathTransform.Transform(from);
                transformed[i] = new NetTopologySuite.Geometries.Coordinate(to[0], to[1]);
            }

            return transformed;
        }
    }
}
