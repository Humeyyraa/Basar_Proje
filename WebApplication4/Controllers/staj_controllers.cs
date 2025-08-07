using WebApplication4.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using WebApplication4.Services;
using WebApplication4.Helpers;
using NetTopologySuite.IO;
using WebApplication4.Helpers;
using Microsoft.EntityFrameworkCore;

namespace WebApplication4.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PointController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PointController(AppDbContext context)
        {
            _context = context;
        }

        // 1. TÜM NOKTALARI GETİR
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


        // 2. TEK BİR NOKTAYI ID İLE GETİR
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
                WKT = point.Location?.AsText() // Geometry'yi WKT'ye çevir
            };

            return Ok(new ResponseDto<PointDto>
            {
                Mesaj = "Kayıt bulundu.",
                Data = dto
            });
        }


        // 3. YENİ NOKTA EKLE

        
   [HttpPost]
public async Task<IActionResult> Post(PointDto dto)
{
    var geometry = new NetTopologySuite.IO.WKTReader().Read(dto.WKT);

    var point = new Point
    {
        Name = dto.Name,
        Location = geometry,
        Tip = dto.Tip
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

        /*
        [HttpPost]
        public ActionResult AddPoint(DTO_CreatePoint dto)
        {
            var geometry = GeometryHelper.WktToGeometry(dto.WKT, 4326, 3857);

            var point = new Point
            {
                Name = dto.Name,
                Location = geometry
            };

            var added = _service.Add(point);

            return Ok(new
            {
                added.Id,
                added.Name,
                added.Location
            });
        }
        */





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


        // 5. KAYIT SİL
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

        // 6. TÜM ID'LERİ GETİR (Debug/test için)
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


