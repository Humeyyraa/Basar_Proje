using WebApplication4.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using WebApplication4.Services;
using WebApplication4.Helpers;
using NetTopologySuite.IO;
using NetTopologySuite.Geometries;
using WebApplication4.Helpers;
using Microsoft.EntityFrameworkCore;

namespace WebApplication4.Controllers
{
    [Route("api/point")]
    [ApiController]
    public class PointController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PointController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetAllPoints()
        {
            var points = await _context.Points.ToListAsync();
            var dtoList = points.Select(p => new {
                id = p.Id,
                name = p.Name,
                wkt = p.Location?.AsText(),
                type = p.Location?.GeometryType,
                tip = p.Tip
            }).ToList();
            return Ok(new {
                mesaj = "Mevcut liste:",
                data = dtoList
            });
        }


        [HttpGet("{id}")]
        public ActionResult<ResponseDto<PointDto>> GetById(int id)
        {
            var point = _context.Points.FirstOrDefault(p => p.Id == id);
            if (point == null)
                return NotFound();

            var dto = new PointDto
            {
                Id = point.Id,
                Name = point.Name,
                WKT = point.Location?.AsText(), 
                Tip = point.Tip
            };

            return Ok(new ResponseDto<PointDto>
            {
                Mesaj = "Kayıt bulundu.",
                Data = dto
            });
        }

        
   [HttpPost]
public async Task<IActionResult> Post([FromBody] PointDto dto, [FromQuery] int? polygonId)
{
    if (dto == null || string.IsNullOrWhiteSpace(dto.WKT))
    {
        return BadRequest(new ResponseDto<string>
        {
            Mesaj = "Geçersiz istek: WKT boş olamaz.",
            Data = null
        });
    }

    Geometry geometry;
    try
    {
        geometry = new NetTopologySuite.IO.WKTReader().Read(dto.WKT);
    }
    catch
    {
        return BadRequest(new ResponseDto<string>
        {
            Mesaj = "Geçersiz WKT formatı. Lütfen geçerli bir WKT giriniz (örn: LINESTRING(x1 y1, x2 y2)).",
            Data = null
        });
    }

    var isPointOrLine = geometry is Point || geometry is LineString;
    var isPolygon = geometry is Polygon;

    Geometry? selectedPolygon = null;
    if (isPointOrLine && polygonId.HasValue)
    {
        selectedPolygon = _context.Points
            .AsEnumerable()
            .Where(p => p.Id == polygonId.Value && p.Location is Polygon)
            .Select(p => p.Location)
            .FirstOrDefault();

        if (selectedPolygon == null)
        {
            return BadRequest(new ResponseDto<string>
            {
                Mesaj = "Seçilen poligon bulunamadı.",
                Data = null
            });
        }

        if (!selectedPolygon.Covers(geometry))
        {
            return BadRequest(new ResponseDto<string>
            {
                Mesaj = "Seçilen poligonun dışında çizim yapılamaz.",
                Data = null
            });
        }
    }
    else if (isPointOrLine)
    {
        var anyPolygonCovers = _context.Points
            .AsEnumerable()
            .Where(p => p.Location is Polygon)
            .Select(p => (Polygon)p.Location)
            .Any(poly => poly != null && poly.Covers(geometry));

        if (!anyPolygonCovers)
        {
            return BadRequest(new ResponseDto<string>
            {
                Mesaj = "Herhangi bir poligonun dışında çizim yapılamaz.",
                Data = null
            });
        }
    }

    var tip = dto.Tip?.Trim().ToUpperInvariant();
    if (isPointOrLine && string.IsNullOrWhiteSpace(tip))
    {
        return BadRequest(new ResponseDto<string>
        {
            Mesaj = "Tip (A/B/C) zorunludur.",
            Data = null
        });
    }

    if (isPointOrLine && tip == "B")
    {
        // B tipi: 
        var aTypeCandidates = _context.Points
            .AsEnumerable()
            .Where(p => ((p.Tip ?? string.Empty).Trim().ToUpperInvariant()) == "A");

        if (selectedPolygon != null)
        {
            aTypeCandidates = aTypeCandidates.Where(p => p.Location != null && selectedPolygon.Covers(p.Location));
        }

        var aTypeGeometries = aTypeCandidates
            .Where(p => p.Location is Point || p.Location is LineString)
            .Select(p => p.Location)
            .ToList();

        // Numerik hassasiyet için küçük bir tolerans kullan
        const double TOLERANCE = 1e-6; // derece cinsinden (~10 cm–1 m arası ölçek)
        var intersectsWithA = aTypeGeometries.Any(aGeom =>
            aGeom != null && (geometry.Intersects(aGeom) || geometry.IsWithinDistance(aGeom, TOLERANCE)));

        if (!intersectsWithA)
        {
            return BadRequest(new ResponseDto<string>
            {
                Mesaj = "Tip B, Tip A ile kesişmelidir.",
                Data = null
            });
        }
    }
    else if (isPointOrLine && tip == "A")
    {
        // A tipi
    }
    else if (isPointOrLine && tip == "C")
    {
        // C tipi
        const double TOLERANCE = 1e-6;

        var aTypeCandidatesForC = _context.Points
            .AsEnumerable()
            .Where(p => ((p.Tip ?? string.Empty).Trim().ToUpperInvariant()) == "A");
        if (selectedPolygon != null)
        {
            aTypeCandidatesForC = aTypeCandidatesForC.Where(p => p.Location != null && selectedPolygon.Covers(p.Location));
        }
        var aTypeGeometriesForC = aTypeCandidatesForC
            .Where(p => p.Location is Point || p.Location is LineString)
            .Select(p => p.Location)
            .ToList();

        var intersectsWithAForC = aTypeGeometriesForC.Any(aGeom =>
            aGeom != null && (geometry.Intersects(aGeom) || geometry.IsWithinDistance(aGeom, TOLERANCE)));
        if (intersectsWithAForC)
        {
            return BadRequest(new ResponseDto<string>
            {
                Mesaj = "Tip C, Tip A ile kesişmemelidir.",
                Data = null
            });
        }

        var bTypeCandidatesForC = _context.Points
            .AsEnumerable()
            .Where(p => ((p.Tip ?? string.Empty).Trim().ToUpperInvariant()) == "B");
        if (selectedPolygon != null)
        {
            bTypeCandidatesForC = bTypeCandidatesForC.Where(p => p.Location != null && selectedPolygon.Covers(p.Location));
        }
        var bTypeGeometriesForC = bTypeCandidatesForC
            .Where(p => p.Location is Point || p.Location is LineString)
            .Select(p => p.Location)
            .ToList();

        var intersectsWithBForC = bTypeGeometriesForC.Any(bGeom =>
            bGeom != null && (geometry.Intersects(bGeom) || geometry.IsWithinDistance(bGeom, TOLERANCE)));
        if (!intersectsWithBForC)
        {
            return BadRequest(new ResponseDto<string>
            {
                Mesaj = "Tip C, yalnızca Tip B üzerinde çizilebilir.",
                Data = null
            });
        }
    }
    else if (isPointOrLine)
    {
        return BadRequest(new ResponseDto<string>
        {
            Mesaj = "Geçersiz tip. Geçerli değerler: A, B, C.",
            Data = null
        });
    }

    var normalizedTip = isPointOrLine ? tip : null;
    var point = new Point
    {
        Name = dto.Name,
        Location = geometry,
        Tip = normalizedTip
    };

    _context.Points.Add(point);
    await _context.SaveChangesAsync();

    return Ok(new
    {
        id = point.Id,
        name = point.Name,
        wkt = point.Location.AsText(),
        type = geometry.GeometryType,
        tip = point.Tip
    });
}





        public class UpdateWKTDto
        {
            public string wkt { get; set; }
            public string name { get; set; }
        }

        [HttpPut("{id}/wkt")]
        public ActionResult<ResponseDto<Point>> UpdateWKT(int id, [FromBody] UpdateWKTDto dto)
        {
            var updatedPoint = _context.Points.FirstOrDefault(p => p.Id == id);
            if (updatedPoint == null)
            {
                return NotFound(new ResponseDto<string>
                {
                    Mesaj = "Güncellenecek kayıt bulunamadı.",
                    Data = null
                });
            }

            if (!string.IsNullOrEmpty(dto.wkt))
                updatedPoint.Location = new NetTopologySuite.IO.WKTReader().Read(dto.wkt);
            if (!string.IsNullOrEmpty(dto.name))
                updatedPoint.Name = dto.name;

            _context.SaveChanges();

            return Ok(new ResponseDto<Point>
            {
                Mesaj = "Kayıt başarıyla güncellendi.",
                Data = updatedPoint
            });
        }


        [HttpDelete("{id}")]
        public ActionResult<ResponseDto<string>> DeletePoint(int id)
        {
            var point = _context.Points.FirstOrDefault(p => p.Id == id);
            if (point == null)
            {
                return NotFound(new ResponseDto<string>
                {
                    Mesaj = "Kayıt bulunamadı, silinemedi.",
                    Data = null
                });
            }

            _context.Points.Remove(point);
            _context.SaveChanges();

            return Ok(new ResponseDto<string>
            {
                Mesaj = "Kayıt başarıyla silindi.",
                Data = null
            });
        }

        [HttpGet("ids")]
        public ActionResult<ResponseDto<List<int>>> GetAllIds()
        {
            var ids = _context.Points.Select(p => p.Id).ToList();
            return Ok(new ResponseDto<List<int>>
            {
                Mesaj = "Kayıtlı ID'ler:",
                Data = ids
            });
        }

       
    }
}



// // http://localhost:5000


