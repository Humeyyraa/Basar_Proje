/*using System;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using NetTopologySuite.Geometries.Utilities;

using ProjNet.CoordinateSystems;
using ProjNet.CoordinateSystems.Transformations;

namespace WebApplication4.Helpers
{
    public static class GeometryHelper
    {
        public static Geometry WktToGeometry(string wkt, int sourceSRID = 4326, int? targetSRID = null)
        {
            var reader = new WKTReader();
            Geometry geometry = reader.Read(wkt) as Geometry;

            if (geometry == null)
                throw new ArgumentException("Geometri oluşturulamadı.");

            geometry.SRID = sourceSRID;

            if (targetSRID.HasValue && targetSRID != sourceSRID)
            {
                var sourceCs = GeographicCoordinateSystem.WGS84;
                var targetCs = ProjectedCoordinateSystem.WebMercator;

                var transformFactory = new CoordinateTransformationFactory();
                var transform = transformFactory.CreateFromCoordinateSystems(sourceCs, targetCs);

                geometry = GeometryTransform.TransformGeometry(
                    geometry.Factory,
                    geometry,
                    transform.MathTransform
                );

                geometry.SRID = targetSRID.Value;
            }

            return geometry;
        }
    }
}


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
            var geometry = reader.Read(wkt) as Geometry;

            if (geometry == null)
                throw new ArgumentException("Geometri oluşturulamadı.");

            geometry.SRID = sourceSRID;

            if (targetSRID.HasValue && targetSRID != sourceSRID)
            {
                var sourceCs = GeographicCoordinateSystem.WGS84;
                var targetCs = ProjectedCoordinateSystem.WebMercator;

                var transformFactory = new CoordinateTransformationFactory();
                var transform = transformFactory.CreateFromCoordinateSystems(sourceCs, targetCs);

                // Koordinatları dönüştür
                var transformedCoordinates = new Coordinate[geometry.Coordinates.Length];
                for (int i = 0; i < geometry.Coordinates.Length; i++)
                {
                    double[] fromPoint = { geometry.Coordinates[i].X, geometry.Coordinates[i].Y };
                    double[] toPoint = transform.MathTransform.Transform(fromPoint);
                    transformedCoordinates[i] = new Coordinate(toPoint[0], toPoint[1]);
                }

                var factory = geometry.Factory;

                // Yeni geometri oluştur
                if (geometry is Point)
                {
                    geometry = factory.CreatePoint(transformedCoordinates[0]);
                }
                else if (geometry is LineString)
                {
                    geometry = factory.CreateLineString(transformedCoordinates);
                }
                else if (geometry is Polygon)
                {
                    var shell = factory.CreateLinearRing(transformedCoordinates);
                    geometry = factory.CreatePolygon(shell);
                }
                else
                {
                    throw new NotSupportedException($"Geometri tipi '{geometry.GeometryType}' desteklenmiyor.");
                }

                geometry.SRID = targetSRID.Value;
            }

            return geometry;
        }
    }
}

*/
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
