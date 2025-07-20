//PointService, veritabanı ile ilgili asıl işleri yapan sınıf.
// Controller sadece yönlendirici, Service işin mutfağıdır.
using NetTopologySuite.IO;
using WebApplication4;
using System.Collections.Generic;
using System.Linq;
using WebApplication4.Services;
using Microsoft.EntityFrameworkCore;



namespace WebApplication4.Services
{
    public class PointService : MyInterface
    {
        private readonly AppDbContext _context;

        public PointService(AppDbContext context)
        {
            _context = context;
        }

        public List<Point> GetAll()
        {
            try
            {
                return _context.Points.ToList(); // uyarı
            }
            catch (Exception ex)
            {
                Console.WriteLine(" Veritabanı hatası: " + ex.Message);
                Console.WriteLine(" StackTrace: " + ex.StackTrace);
                throw;
            }
        }




        public Point GetById(int id)
        {
            return _context.Points.Find(id);
        }

        public Point Add(Point p)
        {
            
            int newId = 1;
            var usedIds = _context.Points.Select(x => x.Id).ToHashSet();

            while (usedIds.Contains(newId))
            {
                newId++;
            }

            p.Id = newId;

            _context.Points.Add(p);
            _context.SaveChanges();

            return p;
        }


        public bool Delete(int id)
        {
            var point = _context.Points.Find(id);
            if (point == null) return false;
            _context.Points.Remove(point);
            _context.SaveChanges();
            return true;
        }

        

public Point UpdateWKT(int id, string newWKT)
    {
        var point = _context.Points.Find(id);
        if (point == null) return null;

        var reader = new WKTReader(); 
        point.Location = reader.Read(newWKT); 

        _context.SaveChanges();
        return point;
    }

}
}
