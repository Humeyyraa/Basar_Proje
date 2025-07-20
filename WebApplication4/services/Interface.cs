using System.Collections.Generic;

namespace WebApplication4.Services
{
    public interface MyInterface
    {
        List<Point> GetAll();
        Point GetById(int id);
        Point Add(Point p);
        bool Delete(int id);
        Point UpdateWKT(int id, string newWKT);
    }
}
